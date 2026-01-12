import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/auth-helpers"

// POST - Synchroniser/Recalculer les recettes journalières pour une date et un magasin
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canManage = await hasPermission(session.user.id, "accounting.manage")
    if (!canManage) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { storeId, date } = body

    if (!storeId || !date) {
      return NextResponse.json(
        { error: "storeId et date sont requis" },
        { status: 400 }
      )
    }

    // Convertir la date en début de journée
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Calculer la somme des clôtures de caisse du jour pour ce magasin
    const dayCloses = await prisma.dayClose.findMany({
      where: {
        storeId,
        closeDate: {
          gte: targetDate,
          lte: endOfDay,
        },
      },
    })
    const totalDayCloses = dayCloses.reduce((sum, dc) => sum + dc.totalRevenue, 0)

    // Calculer la somme des dépenses du jour pour ce magasin
    const expenses = await prisma.expense.findMany({
      where: {
        storeId,
        createdAt: {
          gte: targetDate,
          lte: endOfDay,
        },
      },
    })
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

    // Mettre à jour ou créer la recette journalière
    const dailyRevenue = await prisma.dailyRevenue.upsert({
      where: {
        storeId_date: {
          storeId,
          date: targetDate,
        },
      },
      update: {
        totalDayCloses,
        totalExpenses,
      },
      create: {
        storeId,
        date: targetDate,
        totalDayCloses,
        totalExpenses,
        createdById: session.user.id,
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      ...dailyRevenue,
      dayClosesCount: dayCloses.length,
      expensesCount: expenses.length,
    })
  } catch (error) {
    console.error("[DAILY_REVENUES_SYNC]", error)
    return NextResponse.json(
      { error: "Erreur lors de la synchronisation" },
      { status: 500 }
    )
  }
}
