import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/auth-helpers"

// GET /api/accounting/categories/[id] - Détails d'une catégorie
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canView = await hasPermission(session.user.id, "accounting.categories.view")
    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const category = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 })
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error("[ACCOUNTING_CATEGORY_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT /api/accounting/categories/[id] - Modifier une catégorie
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canManage = await hasPermission(session.user.id, "accounting.categories.manage")
    if (!canManage) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, icon, color, isActive } = body

    // Vérifier que la catégorie existe
    const existing = await prisma.expenseCategory.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 })
    }

    // Vérifier si le nouveau nom existe déjà (si changé)
    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.expenseCategory.findUnique({
        where: { name: name.trim() }
      })
      if (duplicate) {
        return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà" }, { status: 400 })
      }
    }

    const category = await prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(isActive !== undefined && { isActive }),
      }
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error("[ACCOUNTING_CATEGORY_PUT]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/accounting/categories/[id] - Supprimer une catégorie
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const canManage = await hasPermission(session.user.id, "accounting.categories.manage")
    if (!canManage) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    // Vérifier que la catégorie existe
    const existing = await prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: "Catégorie non trouvée" }, { status: 404 })
    }

    // Ne pas supprimer les catégories système
    if (existing.isSystem) {
      return NextResponse.json({ error: "Impossible de supprimer une catégorie système" }, { status: 400 })
    }

    // Ne pas supprimer si des dépenses sont liées
    if (existing._count.expenses > 0) {
      return NextResponse.json({ 
        error: `Impossible de supprimer cette catégorie car ${existing._count.expenses} dépense(s) y sont liées` 
      }, { status: 400 })
    }

    await prisma.expenseCategory.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ACCOUNTING_CATEGORY_DELETE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
