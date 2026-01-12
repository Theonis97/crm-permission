import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer les détails d'une recette journalière (clôtures + dépenses)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "accounting.view")
    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const { id } = await params

    const dailyRevenue = await prisma.dailyRevenue.findUnique({
      where: { id },
      include: {
        store: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
      },
    })

    if (!dailyRevenue) {
      return NextResponse.json({ error: "Recette non trouvée" }, { status: 404 })
    }

    // Récupérer les clôtures de caisse du jour
    const dayStart = new Date(dailyRevenue.date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dailyRevenue.date)
    dayEnd.setHours(23, 59, 59, 999)

    const dayCloses = await prisma.dayClose.findMany({
      where: {
        storeId: dailyRevenue.storeId,
        closeDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        user: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    // Récupérer les dépenses du jour
    const expenses = await prisma.expense.findMany({
      where: {
        storeId: dailyRevenue.storeId,
        createdAt: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        category: {
          select: { id: true, name: true, color: true, icon: true },
        },
        createdBy: {
          select: { id: true, name: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json({
      ...dailyRevenue,
      dayCloses,
      expenses,
      netRevenue: (dailyRevenue.countedRevenue || dailyRevenue.totalDayCloses) - dailyRevenue.totalExpenses,
    })
  } catch (error) {
    console.error("[DAILY_REVENUE_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la recette" },
      { status: 500 }
    )
  }
}

// PATCH - Mettre à jour la recette comptée
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canManage = await hasPermission(session.user.id, "accounting.manage")
    if (!canManage) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { countedRevenue, notes } = body

    const dailyRevenue = await prisma.dailyRevenue.update({
      where: { id },
      data: {
        countedRevenue: countedRevenue !== undefined ? countedRevenue : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        store: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(dailyRevenue)
  } catch (error) {
    console.error("[DAILY_REVENUE_PATCH]", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la recette" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une recette journalière
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canManage = await hasPermission(session.user.id, "accounting.manage")
    if (!canManage) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const { id } = await params

    await prisma.dailyRevenue.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[DAILY_REVENUE_DELETE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la recette" },
      { status: 500 }
    )
  }
}
