import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    // Calculer la date de début selon la période
    const now = new Date()
    let startDate = new Date()

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0)
        break
      case "week":
        startDate.setDate(now.getDate() - 7)
        break
      case "month":
        startDate.setMonth(now.getMonth() - 1)
        break
      case "year":
        startDate.setFullYear(now.getFullYear() - 1)
        break
    }

    // Récupérer les statistiques en parallèle
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      completedTasks,
      totalOpportunities,
      topProducts,
      recentOrders,
    ] = await Promise.all([
      // Nombre total de commandes
      prisma.storeOrder.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Chiffre d'affaires total
      prisma.storeOrder.aggregate({
        where: {
          createdAt: { gte: startDate },
          paymentStatus: "PAID",
        },
        _sum: {
          total: true,
        },
      }),

      // Nombre de clients uniques
      prisma.storeOrder.groupBy({
        by: ["contactId"],
        where: {
          createdAt: { gte: startDate },
          contactId: { not: null },
        },
      }),

      // Nombre de produits actifs
      prisma.product.count(),

      // Tâches complétées
      prisma.task.count({
        where: {
          status: "COMPLETED",
          updatedAt: { gte: startDate },
        },
      }),

      // Opportunités actives
      prisma.opportunity.count({
        where: {
          status: { in: ["NEW", "IN_PROGRESS"] },
        },
      }),

      // Top 5 produits les plus vendus
      prisma.storeOrderItem.groupBy({
        by: ["productId"],
        where: {
          storeOrder: {
            createdAt: { gte: startDate },
          },
        },
        _sum: {
          quantity: true,
          total: true,
        },
        orderBy: {
          _sum: {
            quantity: "desc",
          },
        },
        take: 5,
      }),

      // Dernières commandes
      prisma.storeOrder.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        include: {
          contact: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
    ])

    // Récupérer les détails des produits top
    const productIds = topProducts.map((p) => p.productId)
    const productsDetails = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    })

    // Formater les top produits
    const formattedTopProducts = topProducts.map((p) => {
      const product = productsDetails.find((pd) => pd.id === p.productId)
      return {
        name: product?.name || "Produit inconnu",
        sku: product?.sku,
        sales: p._sum.quantity || 0,
        revenue: p._sum.total || 0,
      }
    })

    // Formater les commandes récentes
    const formattedRecentOrders = recentOrders.map((order) => ({
      id: order.number,
      customer: order.contact
        ? `${order.contact.firstName || ""} ${order.contact.lastName || ""}`.trim() || order.customerName
        : order.customerName,
      amount: order.total,
      status: order.status.toLowerCase(),
      date: order.createdAt,
    }))

    // Calculer les statistiques avec période précédente pour le changement
    const previousStartDate = new Date(startDate)
    previousStartDate.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()))

    const [previousRevenue, previousOrders] = await Promise.all([
      prisma.storeOrder.aggregate({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
          paymentStatus: "PAID",
        },
        _sum: {
          total: true,
        },
      }),
      prisma.storeOrder.count({
        where: {
          createdAt: {
            gte: previousStartDate,
            lt: startDate,
          },
        },
      }),
    ])

    // Calculer les pourcentages de changement
    const revenueChange = previousRevenue._sum.total
      ? ((totalRevenue._sum.total || 0) - previousRevenue._sum.total) / previousRevenue._sum.total * 100
      : 0

    const ordersChange = previousOrders
      ? ((totalOrders - previousOrders) / previousOrders) * 100
      : 0

    return NextResponse.json({
      stats: {
        revenue: totalRevenue._sum.total || 0,
        revenueChange: Number(revenueChange.toFixed(1)),
        orders: totalOrders,
        ordersChange: Number(ordersChange.toFixed(1)),
        customers: totalCustomers.length,
        customersChange: 5.4, // À calculer avec période précédente
        products: totalProducts,
        productsChange: 0,
        tasks: completedTasks,
        tasksChange: 15.8, // À calculer avec période précédente
        opportunities: totalOpportunities,
        opportunitiesChange: 10.5, // À calculer avec période précédente
      },
      topProducts: formattedTopProducts,
      recentOrders: formattedRecentOrders,
      period,
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques" },
      { status: 500 }
    )
  }
}
