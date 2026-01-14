import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"

// Fonction pour calculer le statut d'une dépense
function calculateExpenseStatus(paidAmount: number, totalAmount: number): "PENDING" | "PARTIALLY_PAID" | "PAID" {
  if (paidAmount === 0) return "PENDING"
  if (paidAmount >= totalAmount) return "PAID"
  return "PARTIALLY_PAID"
}

// GET /api/accounting/expenses/[id]/payments - Historique des paiements
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canView = await hasPermission(session.user.id, "accounting.expenses.view")
    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    // Vérifier que la dépense existe
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, amount: true, paidAmount: true, remainingAmount: true, status: true }
    })

    if (!expense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    const payments = await prisma.expensePayment.findMany({
      where: { expenseId: id },
      include: {
        paidBy: {
          select: { id: true, name: true, firstName: true, lastName: true }
        },
        documents: true
      },
      orderBy: { paymentDate: "desc" }
    })

    return NextResponse.json({ 
      payments,
      expense: {
        amount: expense.amount,
        paidAmount: expense.paidAmount,
        remainingAmount: expense.remainingAmount,
        status: expense.status
      }
    })
  } catch (error) {
    console.error("[ACCOUNTING_PAYMENTS_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/accounting/expenses/[id]/payments - Enregistrer un paiement
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Récupérer d'abord la dépense pour vérifier les permissions
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, storeId: true, amount: true, paidAmount: true, remainingAmount: true }
    })

    if (!expense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    // Vérifier les permissions : soit permission globale, soit permission magasin
    const canPayGlobal = await hasPermission(session.user.id, "accounting.expenses.pay")
    let canPayStore = false
    
    if (!canPayGlobal && expense.storeId) {
      // Vérifier si l'utilisateur a accès aux dépenses de ce magasin
      canPayStore = await hasStorePermission(session.user.id, expense.storeId, "store.expenses.view")
    }

    if (!canPayGlobal && !canPayStore) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { 
      amount, 
      paymentDate, 
      paymentMode, 
      reference, 
      receiptUrl, 
      receiptName, 
      documents, // Nouveau: tableau de documents [{url, name, type?, size?, mimeType?}]
      notes 
    } = body

    // Validations
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Le montant doit être supérieur à 0" }, { status: 400 })
    }

    if (!paymentDate) {
      return NextResponse.json({ error: "La date de paiement est requise" }, { status: 400 })
    }

    if (!paymentMode) {
      return NextResponse.json({ error: "Le mode de paiement est requis" }, { status: 400 })
    }

    // Vérifier que le montant ne dépasse pas le reste à payer
    if (amount > expense.remainingAmount) {
      return NextResponse.json({ 
        error: `Le montant (${amount}) dépasse le reste à payer (${expense.remainingAmount})` 
      }, { status: 400 })
    }

    // Transaction pour créer le paiement et mettre à jour la dépense
    const result = await prisma.$transaction(async (tx) => {
      // Créer le paiement
      const payment = await tx.expensePayment.create({
        data: {
          expenseId: id,
          amount,
          paymentDate: new Date(paymentDate),
          paymentMode,
          reference: reference?.trim() || null,
          receiptUrl: receiptUrl || null, // Conservé pour rétrocompatibilité
          receiptName: receiptName || null,
          notes: notes?.trim() || null,
          paidById: session.user.id,
        },
      })

      // Créer les documents si fournis
      if (documents && Array.isArray(documents) && documents.length > 0) {
        await tx.expenseDocument.createMany({
          data: documents.map((doc: { url: string; name: string; type?: string; size?: number; mimeType?: string }) => ({
            paymentId: payment.id,
            url: doc.url,
            name: doc.name,
            type: doc.type || "receipt",
            size: doc.size || null,
            mimeType: doc.mimeType || null,
          }))
        })
      } else if (receiptUrl) {
        // Rétrocompatibilité: si un seul reçu est fourni via receiptUrl
        await tx.expenseDocument.create({
          data: {
            paymentId: payment.id,
            url: receiptUrl,
            name: receiptName || "Reçu",
            type: "receipt",
          }
        })
      }

      // Mettre à jour la dépense
      const newPaidAmount = expense.paidAmount + amount
      const newRemainingAmount = expense.amount - newPaidAmount
      const newStatus = calculateExpenseStatus(newPaidAmount, expense.amount)

      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
        }
      })

      // Récupérer le paiement avec les documents
      const paymentWithDocs = await tx.expensePayment.findUnique({
        where: { id: payment.id },
        include: {
          paidBy: {
            select: { id: true, name: true, firstName: true, lastName: true }
          },
          documents: true
        }
      })

      return { payment: paymentWithDocs, expense: updatedExpense }
    })

    return NextResponse.json({ 
      payment: result.payment,
      expense: {
        paidAmount: result.expense.paidAmount,
        remainingAmount: result.expense.remainingAmount,
        status: result.expense.status
      }
    }, { status: 201 })
  } catch (error) {
    console.error("[ACCOUNTING_PAYMENTS_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
