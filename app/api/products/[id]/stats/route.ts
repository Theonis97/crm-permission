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

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json({ error: "storeId requis" }, { status: 400 })
    }

    // Date de début (il y a 12 mois)
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - 11)
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    // Date de fin (aujourd'hui)
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)

    // Récupérer toutes les commandes contenant ce produit
    const orderItems = await prisma.storeOrderItem.findMany({
      where: {
        productId,
        storeOrder: {
          storeId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          status: {
            not: "CANCELLED", // Exclure les commandes annulées
          },
        },
      },
      include: {
        storeOrder: {
          select: {
            id: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: {
        storeOrder: {
          createdAt: "asc",
        },
      },
    })

    // Grouper par mois
    const monthlyStats: { [key: string]: { orders: number; revenue: number; quantity: number } } = {}

    // Initialiser tous les mois avec 0
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - (11 - i))
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyStats[monthKey] = { orders: 0, revenue: 0, quantity: 0 }
    }

    // Compter les commandes et le CA
    const processedOrders = new Set<string>()
    orderItems.forEach((item) => {
      const date = new Date(item.storeOrder.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (monthlyStats[monthKey]) {
        // Compter chaque commande une seule fois
        if (!processedOrders.has(item.storeOrder.id)) {
          monthlyStats[monthKey].orders++
          processedOrders.add(item.storeOrder.id)
        }
        
        // Ajouter le CA et la quantité
        monthlyStats[monthKey].revenue += item.total
        monthlyStats[monthKey].quantity += item.quantity
      }
    })

    // Formatter les données pour le graphique
    const chartData = Object.entries(monthlyStats)
      .map(([monthKey, stats]) => {
        const [year, month] = monthKey.split("-")
        const date = new Date(parseInt(year), parseInt(month) - 1)
        const monthName = date.toLocaleDateString("fr-FR", { month: "short" })

        return {
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          monthKey,
          orders: stats.orders,
          revenue: Math.round(stats.revenue),
          quantity: stats.quantity,
        }
      })
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))

    // Statistiques globales
    const totalOrders = processedOrders.size
    const totalRevenue = Object.values(monthlyStats).reduce((sum, stats) => sum + stats.revenue, 0)
    const totalQuantity = Object.values(monthlyStats).reduce((sum, stats) => sum + stats.quantity, 0)

    return NextResponse.json({
      chartData,
      summary: {
        totalOrders,
        totalRevenue: Math.round(totalRevenue),
        totalQuantity,
        avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      },
    })
  } catch (error) {
    console.error("Error fetching product stats:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
