import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/auth-helpers"

// GET /api/accounting/categories - Liste des catégories de dépenses
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const categories = await prisma.expenseCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { expenses: true }
        }
      }
    })

    // Calculer le total des dépenses par catégorie
    const categoriesWithSum = await Promise.all(
      categories.map(async (cat) => {
        const sum = await prisma.expense.aggregate({
          where: { categoryId: cat.id },
          _sum: { amount: true }
        })
        return {
          ...cat,
          _sum: { amount: sum._sum.amount || 0 }
        }
      })
    )

    return NextResponse.json({ categories: categoriesWithSum })
  } catch (error) {
    console.error("[ACCOUNTING_CATEGORIES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/accounting/categories - Créer une catégorie
export async function POST(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    // Vérifier la permission (ou accounting.view comme fallback)
    const canManage = await hasPermission(session.user.id, "accounting.categories.manage")
    const canView = await hasPermission(session.user.id, "accounting.view")
    if (!canManage && !canView) {
      return NextResponse.json({ error: "Permission refusée pour gérer les catégories" }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, icon, color } = body

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Le nom est requis" }, { status: 400 })
    }

    // Vérifier si le nom existe déjà
    const existing = await prisma.expenseCategory.findUnique({
      where: { name: name.trim() }
    })

    if (existing) {
      return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà" }, { status: 400 })
    }

    const category = await prisma.expenseCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || null,
        color: color || null,
        isSystem: false,
      }
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error: any) {
    console.error("[ACCOUNTING_CATEGORIES_POST]", error)
    // Erreur de contrainte unique (nom déjà existant)
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà" }, { status: 400 })
    }
    return NextResponse.json({ error: "Erreur serveur: " + (error?.message || "inconnue") }, { status: 500 })
  }
}
