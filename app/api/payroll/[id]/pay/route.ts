import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { getPrimaryStoreForPayroll } from "@/lib/payroll-primary-store"

// POST - Enregistrer un paiement (total ou partiel / acompte) sur un bulletin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const {
      amount: requestedAmount,
      paymentMode = "BANK",
      paymentReference,
      reference,
      notes,
    } = body

    // Vérifier que le bulletin existe avec les infos employé et boutique
    const existing = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employeeProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                storeUserRoles: {
                  orderBy: { assignedAt: "desc" },
                  include: {
                    store: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        period: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bulletin non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier le statut — on accepte APPROVED et PARTIALLY_PAID
    if (existing.status !== "APPROVED" && existing.status !== "PARTIALLY_PAID") {
      return NextResponse.json(
        { error: "Ce bulletin doit être approuvé ou en cours de paiement pour enregistrer un versement" },
        { status: 400 }
      )
    }

    // Calculer le reste à payer
    const currentRemaining = existing.status === "APPROVED"
      ? existing.netSalary
      : existing.remainingAmount

    // Déterminer le montant du versement
    const paymentAmount = requestedAmount
      ? Math.min(parseFloat(requestedAmount), currentRemaining)
      : currentRemaining // Si pas de montant spécifié = paiement total du solde

    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: "Le montant du versement doit être supérieur à 0" },
        { status: 400 }
      )
    }

    // Calculer les nouveaux totaux
    const newPaidAmount = existing.paidAmount + paymentAmount
    const newRemainingAmount = Math.max(0, existing.netSalary - newPaidAmount)
    const isFullyPaid = newRemainingAmount <= 0
    const paymentRef = reference || paymentReference || null

    // Récupérer ou créer la catégorie "Salaire"
    let salaryCategory = await prisma.expenseCategory.findUnique({
      where: { name: "Salaire" },
    })

    if (!salaryCategory) {
      salaryCategory = await prisma.expenseCategory.create({
        data: {
          name: "Salaire",
          description: "Dépenses de salaires des employés",
          icon: "💰",
          color: "#4f46e5",
          isSystem: true,
          isActive: true,
        },
      })
    }

    // Déterminer la boutique de l'employé (affectation la plus récente en premier dans la requête)
    const primaryStore = getPrimaryStoreForPayroll(
      existing.employeeProfile.user.storeUserRoles,
    ) as { id: string; name: string } | null
    const storeId = primaryStore?.id ?? null
    const storeName = primaryStore?.name ?? "Non assigné"

    // Construire le nom de l'employé
    const employeeName = `${existing.employeeProfile.user.firstName || ""} ${existing.employeeProfile.user.lastName || ""}`.trim() || "Employé"

    // Chercher si une dépense existe déjà pour ce bulletin (cas d'un acompte précédent)
    const existingExpense = await prisma.expense.findFirst({
      where: {
        title: { contains: `Salaire - ${employeeName} - ${existing.period.name}` },
        categoryId: salaryCategory.id,
      },
    })

    // Utiliser une transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le bulletin
      const payroll = await tx.payroll.update({
        where: { id },
        data: {
          status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
          paidAt: isFullyPaid ? new Date() : existing.paidAt,
          paymentReference: paymentRef || existing.paymentReference,
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
        },
      })

      // 2. Gérer la dépense comptable
      let expense
      if (existingExpense) {
        // Mettre à jour la dépense existante
        expense = await tx.expense.update({
          where: { id: existingExpense.id },
          data: {
            paidAmount: newPaidAmount,
            remainingAmount: newRemainingAmount,
            status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
          },
        })
      } else {
        // Créer une nouvelle dépense
        expense = await tx.expense.create({
          data: {
            storeId: storeId,
            categoryId: salaryCategory!.id,
            title: `Salaire - ${employeeName} - ${existing.period.name}`,
            description: `Bulletin de paie N° ${existing.number}${storeId ? ` (${storeName})` : " (Sans boutique)"}`,
            amount: existing.netSalary,
            dueDate: new Date(),
            periodicity: "ONCE",
            status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
            paidAmount: paymentAmount,
            remainingAmount: newRemainingAmount,
            createdById: session?.user?.id || "",
          },
        })
      }

      // 3. Créer le paiement de la dépense
      const expensePayment = await tx.expensePayment.create({
        data: {
          expenseId: expense.id,
          amount: paymentAmount,
          paymentDate: new Date(),
          paymentMode: paymentMode,
          reference: paymentRef || `PAY-${existing.number}-${Date.now()}`,
          notes: notes || `Versement${isFullyPaid ? " (solde)" : " (acompte)"} - Bulletin ${existing.number}`,
          paidById: session?.user?.id || "",
        },
      })

      // 4. Créer le versement dans PayrollPayment
      const payrollPayment = await tx.payrollPayment.create({
        data: {
          payrollId: id,
          amount: paymentAmount,
          paymentDate: new Date(),
          paymentMode: paymentMode,
          reference: paymentRef,
          notes: notes || null,
          expensePaymentId: expensePayment.id,
          paidById: session?.user?.id || "",
        },
      })

      // 5. Créer l'entrée d'audit
      const auditComment = isFullyPaid
        ? `Bulletin payé intégralement (${paymentAmount.toLocaleString("fr-FR")} FCFA)${paymentRef ? ` - Réf: ${paymentRef}` : ""}`
        : `Acompte de ${paymentAmount.toLocaleString("fr-FR")} FCFA enregistré. Reste: ${newRemainingAmount.toLocaleString("fr-FR")} FCFA${paymentRef ? ` - Réf: ${paymentRef}` : ""}`

      await tx.payrollAuditLog.create({
        data: {
          payrollId: id,
          userId: session?.user?.id || "",
          action: isFullyPaid ? "PAY" : "PARTIAL_PAY",
          field: "paidAmount",
          oldValue: String(existing.paidAmount),
          newValue: String(newPaidAmount),
          comment: auditComment,
        },
      })

      return { payroll, expense, payrollPayment }
    })

    // Construire le message de réponse
    const message = isFullyPaid
      ? `Bulletin ${result.payroll.number} payé intégralement (${paymentAmount.toLocaleString("fr-FR")} FCFA).`
      : `Acompte de ${paymentAmount.toLocaleString("fr-FR")} FCFA enregistré sur le bulletin ${result.payroll.number}. Reste à payer: ${newRemainingAmount.toLocaleString("fr-FR")} FCFA.`

    return NextResponse.json({
      success: true,
      message,
      payroll: result.payroll,
      expense: result.expense,
      payment: result.payrollPayment,
      summary: {
        netSalary: existing.netSalary,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        isFullyPaid,
        paymentCount: existing.paidAmount > 0 ? "multiple" : "first",
      },
    })
  } catch (error) {
    console.error("Error processing payroll payment:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement du paiement" },
      { status: 500 }
    )
  }
}
