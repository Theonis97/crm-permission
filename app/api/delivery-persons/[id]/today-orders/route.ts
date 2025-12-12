import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: driverId } = await params

    // Vérifier que le livreur existe
    const driver = await prisma.deliveryPerson.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      return NextResponse.json({ error: "Livreur non trouvé" }, { status: 404 })
    }

    // Calculer le début et la fin de la journée
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)

    // Récupérer les commandes du jour pour ce livreur
    // Inclure les commandes créées aujourd'hui ET les commandes livrées aujourd'hui
    const orders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: driverId,
        OR: [
          // Commandes créées aujourd'hui (pour les stats en cours)
          {
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          // Commandes livrées aujourd'hui (pour les stats de livraison)
          {
            status: 'DELIVERED',
            deliveredAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        ],
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

    // Calculer les statistiques
    // Séparer les commandes livrées aujourd'hui pour le calcul des revenus
    const deliveredTodayOrders = orders.filter(o => 
      o.status === "DELIVERED" && 
      o.deliveredAt && 
      new Date(o.deliveredAt) >= startOfDay && 
      new Date(o.deliveredAt) <= endOfDay
    )
    
    const stats = {
      delivered: orders.filter(o => o.status === "DELIVERED").length,
      delivering: orders.filter(o => o.status === "DELIVERING").length,
      confirmed: orders.filter(o => o.status === "CONFIRMED").length,
      pending: orders.filter(o => o.status === "PENDING").length,
      total: orders.length,
      revenue: deliveredTodayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      deliveryFees: deliveredTodayOrders.reduce((sum, o) => sum + (o.deliveryFee || 0), 0),
      orders: orders.map(order => ({
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total || 0,
        deliveryFee: order.deliveryFee || 0,
        createdAt: order.createdAt.toISOString(),
        deliveredAt: order.deliveredAt?.toISOString() || null,
        customerName: order.customerName,
        customerPhone: order.customerPhone || "",
        deliveryAddress: order.deliveryAddress,
      })),
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching today orders:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    )
  }
}
