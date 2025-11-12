import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateTotalCommissions } from "@/lib/commission-calculator"

/**
 * GET /api/delivery/driver-stats
 * Récupère les statistiques complètes d'un livreur
 * Query params:
 * - driverId: ID du livreur
 * - period: 'today' | 'week' | 'month' | 'all' (défaut: 'all')
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const driverId = searchParams.get("driverId")
    const period = searchParams.get("period") || "all"

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: "ID du livreur requis" },
        { status: 400 }
      )
    }

    // Vérifier que le livreur existe
    const driver = await prisma.deliveryPerson.findUnique({
      where: { id: driverId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    })

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Calculer les dates selon la période
    const now = new Date()
    let startDate: Date | undefined

    switch (period) {
      case "today":
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate = new Date()
        startDate.setDate(now.getDate() - 7)
        startDate.setHours(0, 0, 0, 0)
        break
      case "month":
        startDate = new Date()
        startDate.setMonth(now.getMonth() - 1)
        startDate.setHours(0, 0, 0, 0)
        break
      case "all":
        startDate = undefined // Pas de filtre de date
        break
    }

    // Construire le filtre de date
    const dateFilter = startDate
      ? {
          gte: startDate,
          lte: now,
        }
      : undefined

    // Récupérer toutes les commandes du livreur par statut
    const [acceptedOrders, deliveredOrders, cancelledOrders] = await Promise.all([
      // Commandes acceptées (CONFIRMED ou plus)
      prisma.storeOrder.count({
        where: {
          deliveryPersonId: driverId,
          status: {
            in: ["CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED"],
          },
          ...(dateFilter && { createdAt: dateFilter }),
        },
      }),

      // Commandes livrées avec détails pour calculer les commissions
      prisma.storeOrder.findMany({
        where: {
          deliveryPersonId: driverId,
          status: "DELIVERED",
          ...(dateFilter && { deliveredAt: dateFilter }),
        },
        select: {
          id: true,
          number: true,
          total: true,
          deliveredAt: true,
          customerName: true,
        },
      }),

      // Commandes annulées
      prisma.storeOrder.count({
        where: {
          deliveryPersonId: driverId,
          status: "CANCELLED",
          ...(dateFilter && { updatedAt: dateFilter }),
        },
      }),
    ])

    // Calculer les commissions sur les commandes livrées
    const commissionStats = calculateTotalCommissions(deliveredOrders)

    // Récupérer les zones assignées
    const assignedZones = await prisma.deliveryZone.findMany({
      where: {
        deliveryPersonId: driverId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          email: driver.email,
          isActive: driver.isActive,
          joinedAt: driver.createdAt,
        },
        stats: {
          revenue: commissionStats.totalCommission,
          acceptedOrders: acceptedOrders,
          deliveredOrders: deliveredOrders.length,
          cancelledOrders: cancelledOrders,
          averageOrderAmount: commissionStats.averageOrderAmount,
          totalDeliveries: commissionStats.deliveriesCount,
        },
        assignedZones,
        period,
      },
    })
  } catch (error) {
    console.error("❌ Get driver stats error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
