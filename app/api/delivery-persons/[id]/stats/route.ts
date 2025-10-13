import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les statistiques d'un livreur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: deliveryPersonId } = await params

    // Date du jour (début et fin)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // Récupérer toutes les commandes du livreur pour aujourd'hui
    const todayOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        number: true,
        status: true,
        total: true,
        deliveryFee: true,
        createdAt: true,
        deliveredAt: true,
        customerName: true,
        customerPhone: true,
        deliveryAddress: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Statistiques du jour
    const deliveredOrders = todayOrders.filter(o => o.status === "DELIVERED")
    const deliveringOrders = todayOrders.filter(o => o.status === "DELIVERING")
    const pendingOrders = todayOrders.filter(o => 
      ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
    )

    // Calcul du chiffre d'affaires (somme des commandes livrées)
    const todayRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0)
    const todayDeliveryFees = deliveredOrders.reduce((sum, order) => sum + order.deliveryFee, 0)

    // Statistiques globales (tous les temps)
    const allTimeStats = await prisma.storeOrder.groupBy({
      by: ["status"],
      where: {
        deliveryPersonId,
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
        deliveryFee: true,
      },
    })

    const totalDelivered = allTimeStats.find(s => s.status === "DELIVERED")?._count.id || 0
    const allTimeRevenue = allTimeStats.find(s => s.status === "DELIVERED")?._sum.total || 0
    const allTimeDeliveryFees = allTimeStats.find(s => s.status === "DELIVERED")?._sum.deliveryFee || 0

    // Moyenne par commande
    const avgOrderValue = totalDelivered > 0 ? allTimeRevenue / totalDelivered : 0
    const avgDeliveryFee = totalDelivered > 0 ? allTimeDeliveryFees / totalDelivered : 0

    return NextResponse.json({
      today: {
        delivered: deliveredOrders.length,
        delivering: deliveringOrders.length,
        pending: pendingOrders.length,
        total: todayOrders.length,
        revenue: todayRevenue,
        deliveryFees: todayDeliveryFees,
        orders: todayOrders,
      },
      allTime: {
        totalDelivered,
        totalRevenue: allTimeRevenue,
        totalDeliveryFees: allTimeDeliveryFees,
        avgOrderValue,
        avgDeliveryFee,
      },
    })
  } catch (error: any) {
    console.error("Error fetching delivery person stats:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
