import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { authenticateMobileUser } from "@/lib/auth-mobile"
import { calculateTotalCommissions } from "@/lib/commission-calculator"

/**
 * GET /api/mobile/commission
 * Récupère les statistiques de commission du livreur
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'year'
 */
export async function GET(request: NextRequest) {
  try {
    // Authentifier le livreur
    const { user, error } = await authenticateMobileUser(request)

    if (error || !user) {
      return NextResponse.json(
        { error: error || "Non autorisé" },
        { status: 401 }
      )
    }

    const deliveryPersonId = user.id

    // Récupérer la période depuis les query params
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"

    // Calculer les dates de début et fin selon la période
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      default:
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
    }

    console.log("[COMMISSION_API] Récupération des commissions pour le livreur:", deliveryPersonId)
    console.log("[COMMISSION_API] Période:", period, "Du:", startDate.toISOString(), "Au:", now.toISOString())

    // Récupérer toutes les commandes LIVRÉES du livreur dans la période
    const deliveredOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: deliveryPersonId,
        status: "DELIVERED", // Seulement les commandes livrées
        deliveredAt: {
          gte: startDate,
          lte: now,
        },
      },
      select: {
        id: true,
        number: true,
        total: true,
        deliveredAt: true,
        customerName: true,
      },
      orderBy: {
        deliveredAt: "desc",
      },
    })

    console.log("[COMMISSION_API] Commandes livrées trouvées:", deliveredOrders.length)

    // Calculer les commissions
    const stats = calculateTotalCommissions(deliveredOrders)

    // Calculer la croissance par rapport à la période précédente
    const previousStartDate = new Date(startDate)
    const periodDuration = now.getTime() - startDate.getTime()
    previousStartDate.setTime(startDate.getTime() - periodDuration)

    const previousOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: deliveryPersonId,
        status: "DELIVERED",
        deliveredAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      select: {
        total: true,
      },
    })

    const previousStats = calculateTotalCommissions(previousOrders)
    const growth = previousStats.totalCommission > 0
      ? ((stats.totalCommission - previousStats.totalCommission) / previousStats.totalCommission) * 100
      : 0

    console.log("[COMMISSION_API] Commission totale:", stats.totalCommission, "FCFA")
    console.log("[COMMISSION_API] Nombre de livraisons:", stats.deliveriesCount)
    console.log("[COMMISSION_API] Panier moyen:", stats.averageOrderAmount, "FCFA")
    console.log("[COMMISSION_API] Croissance:", growth.toFixed(1), "%")

    return NextResponse.json({
      success: true,
      data: {
        totalCommission: stats.totalCommission,
        deliveriesCount: stats.deliveriesCount,
        averageOrderAmount: stats.averageOrderAmount,
        growth: growth.toFixed(1),
        period,
        orders: deliveredOrders.map((order, index) => ({
          id: order.id,
          number: order.number,
          customerName: order.customerName,
          total: order.total,
          commission: stats.commissionDetails[index]?.commission || 0,
          deliveredAt: order.deliveredAt,
        })),
      },
    })
  } catch (error) {
    console.error("[COMMISSION_API] Erreur:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commissions" },
      { status: 500 }
    )
  }
}
