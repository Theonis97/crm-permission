import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { hasPermission } from "@/lib/auth-helpers"

// Helper pour obtenir les dates de période
function getPeriodDates(period: string): { startDate: Date; endDate: Date } {
  const now = new Date()
  const endDate = new Date(now)
  endDate.setHours(23, 59, 59, 999)

  let startDate = new Date(now)
  startDate.setHours(0, 0, 0, 0)

  switch (period) {
    case "today":
      break
    case "week":
      startDate.setDate(now.getDate() - 7)
      break
    case "month":
      startDate.setMonth(now.getMonth(), 1)
      break
    case "year":
      startDate.setMonth(0, 1)
      break
    default:
      startDate.setMonth(now.getMonth(), 1)
  }

  return { startDate, endDate }
}

// GET /api/accounting/dashboard - Statistiques globales
export async function GET(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const canView = await hasPermission(session.user.id, "accounting.view")
    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else {
      const period = searchParams.get("period") || "month"
      const dates = getPeriodDates(period)
      startDate = dates.startDate
      endDate = dates.endDate
    }

    // Filtre optionnel par magasin
    const storeFilter = storeId ? { storeId } : {}

    // 1. Total des ventes (depuis StoreOrder)
    const salesResult = await prisma.storeOrder.aggregate({
      where: {
        ...storeFilter,
        status: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { total: true },
      _count: true
    })

    // 2. Total des dépenses payées (paiements effectués dans la période)
    const expensesResult = await prisma.expensePayment.aggregate({
      where: {
        expense: storeId ? { storeId } : {},
        paymentDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // 3. Dépenses générales (non liées à un magasin)
    const generalExpensesResult = await prisma.expensePayment.aggregate({
      where: {
        expense: { storeId: null },
        paymentDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // 4. Dépenses en attente
    const pendingExpenses = await prisma.expense.aggregate({
      where: {
        ...(storeId ? { storeId } : {}),
        status: { in: ["PENDING", "PARTIALLY_PAID"] },
        dueDate: { lte: endDate }
      },
      _sum: { remainingAmount: true },
      _count: true
    })

    // 5. Dépenses par catégorie
    const expensesByCategory = await prisma.expensePayment.groupBy({
      by: ["expenseId"],
      where: {
        expense: storeId ? { storeId } : {},
        paymentDate: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })

    // Récupérer les catégories des dépenses
    const expenseIds = expensesByCategory.map(e => e.expenseId)
    const expensesWithCategories = await prisma.expense.findMany({
      where: { id: { in: expenseIds } },
      select: { id: true, categoryId: true, category: { select: { name: true, color: true, icon: true } } }
    })

    // Agréger par catégorie
    const categoryTotals: Record<string, { name: string; color: string | null; icon: string | null; total: number }> = {}
    for (const payment of expensesByCategory) {
      const expense = expensesWithCategories.find(e => e.id === payment.expenseId)
      if (expense) {
        const catId = expense.categoryId
        if (!categoryTotals[catId]) {
          categoryTotals[catId] = {
            name: expense.category.name,
            color: expense.category.color,
            icon: expense.category.icon,
            total: 0
          }
        }
        categoryTotals[catId].total += payment._sum.amount || 0
      }
    }

    // 6. Dernières dépenses
    const recentExpenses = await prisma.expense.findMany({
      where: storeId ? { storeId } : {},
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
        createdBy: { select: { id: true, name: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    })

    // Calculs
    const totalSales = salesResult._sum.total || 0
    const totalExpenses = expensesResult._sum.amount || 0
    const totalGeneralExpenses = generalExpensesResult._sum.amount || 0
    const result = totalSales - totalExpenses
    const isProfitable = result >= 0

    return NextResponse.json({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      storeId: storeId || null,
      summary: {
        totalSales,
        salesCount: salesResult._count,
        totalExpenses,
        totalGeneralExpenses,
        result,
        isProfitable,
        pendingExpensesAmount: pendingExpenses._sum.remainingAmount || 0,
        pendingExpensesCount: pendingExpenses._count
      },
      expensesByCategory: Object.values(categoryTotals).sort((a, b) => b.total - a.total),
      recentExpenses
    })
  } catch (error) {
    console.error("[ACCOUNTING_DASHBOARD_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
