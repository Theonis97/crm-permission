import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer les recettes journalières
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

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
    const now = new Date()

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Par défaut: mois en cours
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }

    const whereClause: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (storeId && storeId !== "all") {
      whereClause.storeId = storeId
    }

    const dailyRevenues = await prisma.dailyRevenue.findMany({
      where: whereClause,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: "desc" },
    })

    // Calculer les totaux
    const totals = dailyRevenues.reduce(
      (acc, dr) => ({
        totalDayCloses: acc.totalDayCloses + dr.totalDayCloses,
        totalExpenses: acc.totalExpenses + dr.totalExpenses,
        totalCountedRevenue: acc.totalCountedRevenue + (dr.countedRevenue || 0),
        totalNetRevenue: acc.totalNetRevenue + ((dr.countedRevenue || dr.totalDayCloses) - dr.totalExpenses),
      }),
      { totalDayCloses: 0, totalExpenses: 0, totalCountedRevenue: 0, totalNetRevenue: 0 }
    )

    return NextResponse.json({
      dailyRevenues,
      totals,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    })
  } catch (error) {
    console.error("[DAILY_REVENUES_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des recettes" },
      { status: 500 }
    )
  }
}

// POST - Créer ou mettre à jour une recette journalière
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
    const { storeId, date, countedRevenue, notes } = body

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

    // Créer ou mettre à jour la recette journalière
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
        countedRevenue: countedRevenue !== undefined ? countedRevenue : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      create: {
        storeId,
        date: targetDate,
        totalDayCloses,
        totalExpenses,
        countedRevenue,
        notes,
        createdById: session.user.id,
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(dailyRevenue)
  } catch (error) {
    console.error("[DAILY_REVENUES_POST]", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la recette" },
      { status: 500 }
    )
  }
}
