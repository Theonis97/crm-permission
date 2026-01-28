import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// POST - Marquer un bulletin comme payé
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { paymentReference, notes } = body

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
                  include: {
                    store: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                  take: 1,
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

    // Vérifier le statut
    if (existing.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Ce bulletin doit d'abord être approuvé avant le paiement" },
        { status: 400 }
      )
    }

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

    // Déterminer la boutique de l'employé
    const storeRole = existing.employeeProfile.user.storeUserRoles?.[0]
    const storeId = storeRole?.store?.id || null
    const storeName = storeRole?.store?.name || "Non assigné"

    // Construire le nom de l'employé
    const employeeName = `${existing.employeeProfile.user.firstName || ""} ${existing.employeeProfile.user.lastName || ""}`.trim() || "Employé"

    // Utiliser une transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le bulletin
      const payroll = await tx.payroll.update({
        where: { id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentReference: paymentReference || null,
        },
      })

      // 2. Créer la dépense associée
      const expense = await tx.expense.create({
        data: {
          storeId: storeId,
          categoryId: salaryCategory!.id,
          title: `Salaire - ${employeeName} - ${existing.period.name}`,
          description: `Paiement du bulletin de paie N° ${existing.number}${storeId ? ` (${storeName})` : " (Sans boutique)"}`,
          amount: existing.netSalary,
          dueDate: new Date(),
          periodicity: "ONCE",
          status: "PAID",
          paidAmount: existing.netSalary,
          remainingAmount: 0,
          createdById: session?.user?.id || "",
        },
      })

      // 3. Créer le paiement de la dépense
      await tx.expensePayment.create({
        data: {
          expenseId: expense.id,
          amount: existing.netSalary,
          paymentDate: new Date(),
          paymentMode: "BANK",
          reference: paymentReference || `PAY-${existing.number}`,
          notes: `Paiement automatique du salaire - Bulletin ${existing.number}`,
          paidById: session?.user?.id || "",
        },
      })

      // 4. Créer l'entrée d'audit
      await tx.payrollAuditLog.create({
        data: {
          payrollId: id,
          userId: session?.user?.id || "",
          action: "PAY",
          comment: notes || `Bulletin payé${paymentReference ? ` (Réf: ${paymentReference})` : ""} - Dépense créée`,
        },
      })

      return { payroll, expense }
    })

    return NextResponse.json({
      success: true,
      message: `Bulletin ${result.payroll.number} marqué comme payé. Dépense créée${storeId ? ` pour ${storeName}` : " (non assignée à une boutique)"}.`,
      payroll: result.payroll,
      expense: result.expense,
    })
  } catch (error) {
    console.error("Error marking payroll as paid:", error)
    return NextResponse.json(
      { error: "Erreur lors du marquage du paiement" },
      { status: 500 }
    )
  }
}
