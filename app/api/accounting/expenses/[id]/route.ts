import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/auth-helpers"

// GET /api/accounting/expenses/[id] - Détails d'une dépense
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

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, name: true }
        },
        category: {
          select: { id: true, name: true, icon: true, color: true }
        },
        createdBy: {
          select: { id: true, name: true, firstName: true, lastName: true }
        },
        payments: {
          include: {
            paidBy: {
              select: { id: true, name: true, firstName: true, lastName: true }
            },
            documents: true
          },
          orderBy: { paymentDate: "desc" }
        },
        documents: true,
        parentExpense: {
          select: { id: true, title: true }
        },
        childExpenses: {
          select: { id: true, title: true, status: true, dueDate: true },
          orderBy: { dueDate: "desc" },
          take: 5
        }
      }
    })

    if (!expense) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSE_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT /api/accounting/expenses/[id] - Modifier une dépense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canEdit = await hasPermission(session.user.id, "accounting.expenses.edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const {
      storeId,
      categoryId,
      title,
      description,
      amount,
      supplierName,
      supplierPhone,
      dueDate,
      periodicity,
      paymentDay,
      documentUrl,
      documentName,
      documents, // Nouveau: tableau de documents [{url, name, type?, size?, mimeType?}]
      documentsToDelete, // IDs des documents à supprimer
      isRecurring,
    } = body

    // Vérifier que la dépense existe
    const existing = await prisma.expense.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    // Si le montant change, recalculer le remainingAmount
    let newRemainingAmount = existing.remainingAmount
    if (amount !== undefined && amount !== existing.amount) {
      newRemainingAmount = amount - existing.paidAmount
      if (newRemainingAmount < 0) {
        return NextResponse.json({ 
          error: "Le nouveau montant ne peut pas être inférieur au montant déjà payé" 
        }, { status: 400 })
      }
    }

    // Calculer le nouveau statut si le montant change
    let newStatus = existing.status
    if (amount !== undefined && amount !== existing.amount) {
      if (existing.paidAmount === 0) {
        newStatus = "PENDING"
      } else if (existing.paidAmount >= amount) {
        newStatus = "PAID"
      } else {
        newStatus = "PARTIALLY_PAID"
      }
    }

    // Utiliser une transaction pour mettre à jour la dépense et gérer les documents
    const expense = await prisma.$transaction(async (tx) => {
      // Supprimer les documents marqués pour suppression
      if (documentsToDelete && Array.isArray(documentsToDelete) && documentsToDelete.length > 0) {
        await tx.expenseDocument.deleteMany({
          where: {
            id: { in: documentsToDelete },
            expenseId: id
          }
        })
      }

      // Ajouter les nouveaux documents
      if (documents && Array.isArray(documents) && documents.length > 0) {
        await tx.expenseDocument.createMany({
          data: documents.map((doc: { url: string; name: string; type?: string; size?: number; mimeType?: string }) => ({
            expenseId: id,
            url: doc.url,
            name: doc.name,
            type: doc.type || "other",
            size: doc.size || null,
            mimeType: doc.mimeType || null,
          }))
        })
      }

      // Mettre à jour la dépense
      return tx.expense.update({
        where: { id },
        data: {
          ...(storeId !== undefined && { storeId: storeId || null }),
          ...(categoryId && { categoryId }),
          ...(title && { title: title.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(amount !== undefined && { 
            amount,
            remainingAmount: newRemainingAmount,
            status: newStatus
          }),
          ...(supplierName !== undefined && { supplierName: supplierName?.trim() || null }),
          ...(supplierPhone !== undefined && { supplierPhone: supplierPhone?.trim() || null }),
          ...(dueDate && { dueDate: new Date(dueDate) }),
          ...(periodicity && { periodicity }),
          ...(paymentDay !== undefined && { paymentDay }),
          ...(documentUrl !== undefined && { documentUrl }),
          ...(documentName !== undefined && { documentName }),
          ...(isRecurring !== undefined && { isRecurring }),
        },
        include: {
          store: {
            select: { id: true, name: true }
          },
          category: {
            select: { id: true, name: true, icon: true, color: true }
          },
          createdBy: {
            select: { id: true, name: true }
          },
          documents: true
        }
      })
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSE_PUT]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/accounting/expenses/[id] - Supprimer une dépense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canDelete = await hasPermission(session.user.id, "accounting.expenses.delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    // Vérifier que la dépense existe
    const existing = await prisma.expense.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payments: true, childExpenses: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: "Dépense non trouvée" }, { status: 404 })
    }

    // Avertir si des paiements existent
    if (existing._count.payments > 0) {
      return NextResponse.json({ 
        error: `Cette dépense a ${existing._count.payments} paiement(s). Supprimez d'abord les paiements.` 
      }, { status: 400 })
    }

    // Supprimer la dépense (les childExpenses seront orphelines mais pas supprimées)
    await prisma.expense.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ACCOUNTING_EXPENSE_DELETE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
