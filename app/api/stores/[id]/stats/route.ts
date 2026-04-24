import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { findUniqueStoreByIdForApi } from "@/lib/store-queries"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !(await hasPermission(user, "stores.view"))) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id: storeId } = await params

    // Récupérer le magasin (select compatible base sans colonnes juridiques)
    const store = await findUniqueStoreByIdForApi(storeId)

    if (!store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Dates pour les filtres
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    // === STATISTIQUES DES PRODUITS ===
    const storeProducts = await prisma.storeProduct.findMany({
      where: { storeId, isActive: true },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
    })

    const totalProducts = storeProducts.length
    const lowStockProducts = storeProducts.filter(sp => sp.stock <= sp.minStock).length
    const outOfStockProducts = storeProducts.filter(sp => sp.stock === 0).length
    const stockValue = storeProducts.reduce((sum, sp) => {
      if (!sp.product) return sum
      const price = sp.prixVente ?? sp.product.prixVente ?? 0
      const qty = Number(sp.stock) || 0
      return sum + price * qty
    }, 0)

    // === STATISTIQUES DES COMMANDES CLIENTS (StoreOrder) ===
    
    // Commandes du mois en cours
    const ordersThisMonth = await prisma.storeOrder.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      include: {
        items: true,
      },
    })

    // Commandes du mois dernier
    const ordersLastMonth = await prisma.storeOrder.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    })

    // Commandes aujourd'hui
    const ordersToday = await prisma.storeOrder.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startOfToday,
        },
      },
    })

    // Statistiques par statut
    const pendingOrders = await prisma.storeOrder.count({
      where: { storeId, status: "PENDING" },
    })

    const deliveredThisMonth = ordersThisMonth.filter(o => o.status === "DELIVERED").length
    const deliveringOrders = await prisma.storeOrder.count({
      where: { storeId, status: "DELIVERING" },
    })

    // Calcul des revenus
    const revenueThisMonth = ordersThisMonth
      .filter(o => o.status === "DELIVERED")
      .reduce((sum, order) => sum + order.total, 0)

    const revenueLastMonth = ordersLastMonth
      .filter(o => o.status === "DELIVERED")
      .reduce((sum, order) => sum + order.total, 0)

    const revenueChange = revenueLastMonth > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
      : 0

    // Moyenne panier
    const averageOrderValue = ordersThisMonth.length > 0
      ? ordersThisMonth.reduce((sum, o) => sum + o.total, 0) / ordersThisMonth.length
      : 0

    const averageOrderValueLastMonth = ordersLastMonth.length > 0
      ? ordersLastMonth.reduce((sum, o) => sum + o.total, 0) / ordersLastMonth.length
      : 0

    const averageOrderChange = averageOrderValueLastMonth > 0
      ? ((averageOrderValue - averageOrderValueLastMonth) / averageOrderValueLastMonth) * 100
      : 0

    // === COMMANDES RÉCENTES ===
    const recentOrders = await prisma.storeOrder.findMany({
      where: { storeId },
      include: {
        contact: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    })

    // === TOP PRODUITS VENDUS DU MOIS ===
    const orderItemsThisMonth = await prisma.storeOrderItem.findMany({
      where: {
        storeOrder: {
          storeId,
          status: "DELIVERED",
          createdAt: {
            gte: startOfMonth,
          },
        },
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    })

    // Grouper par produit
    const productSales = new Map<string, {
      product: any
      quantity: number
      revenue: number
    }>()

    orderItemsThisMonth.forEach((item) => {
      const productId = item.productId
      const product = item.product
      if (!productId || !product) return

      if (productSales.has(productId)) {
        const stats = productSales.get(productId)!
        stats.quantity += item.quantity
        stats.revenue += item.total
      } else {
        productSales.set(productId, {
          product,
          quantity: item.quantity,
          revenue: item.total,
        })
      }
    })

    const topProductsByQuantity = Array.from(productSales.values())
      .filter((v) => v.product != null)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    const topProductsByRevenue = Array.from(productSales.values())
      .filter((v) => v.product != null)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 4)

    // === DONNÉES POUR LES GRAPHIQUES ===
    
    // Revenus des 6 derniers mois
    const monthlyRevenue = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      
      const orders = await prisma.storeOrder.findMany({
        where: {
          storeId,
          status: "DELIVERED",
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      })

      const revenue = orders.reduce((sum, o) => sum + o.total, 0)
      
      monthlyRevenue.push({
        month: monthStart.toLocaleString('fr-FR', { month: 'short' }),
        revenue,
        orders: orders.length,
      })
    }

    // Ventes par jour (7 derniers jours)
    const dailySales = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 23, 59, 59)
      
      const orders = await prisma.storeOrder.count({
        where: {
          storeId,
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      })

      dailySales.push({
        day: dayStart.toLocaleDateString('fr-FR', { weekday: 'short' }),
        sales: orders,
      })
    }

    // === STATISTIQUES DES CONTACTS ===
    const totalContacts = await prisma.storeContact.count({
      where: { storeId },
    })

    const newContactsThisMonth = await prisma.storeContact.count({
      where: {
        storeId,
        createdAt: {
          gte: startOfMonth,
        },
      },
    })

    // === STATISTIQUES DES LIVREURS ===
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: { storeId, isActive: true },
    })

    const availableDrivers = deliveryPersons.filter(d => d.status === "AVAILABLE").length
    const busyDrivers = deliveryPersons.filter(d => d.status === "BUSY").length

    return NextResponse.json({
      store,
      stats: {
        // Produits
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        stockValue,
        
        // Commandes
        totalOrdersThisMonth: ordersThisMonth.length,
        totalOrdersLastMonth: ordersLastMonth.length,
        ordersToday: ordersToday.length,
        pendingOrders,
        deliveringOrders,
        deliveredThisMonth,
        
        // Revenus
        revenueThisMonth,
        revenueLastMonth,
        revenueChange,
        averageOrderValue,
        averageOrderChange,
        
        // Contacts
        totalContacts,
        newContactsThisMonth,
        
        // Livreurs
        totalDrivers: deliveryPersons.length,
        availableDrivers,
        busyDrivers,
      },
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        number: order.number,
        customerName: order.customerName,
        total: order.total,
        status: order.status,
        itemsCount: order.items.length,
        createdAt: order.createdAt,
      })),
      topProducts: {
        byQuantity: topProductsByQuantity
          .filter((item) => item.product != null)
          .map((item) => {
            const p = item.product!
            return {
              id: p.id,
              name: p.name,
              sku: p.sku,
              quantity: item.quantity,
              revenue: item.revenue,
              categoryName: p.category?.name,
            }
          }),
        byRevenue: topProductsByRevenue
          .filter((item) => item.product != null)
          .map((item) => {
            const p = item.product!
            return {
              id: p.id,
              name: p.name,
              quantity: item.quantity,
              revenue: item.revenue,
            }
          }),
      },
      charts: {
        monthlyRevenue,
        dailySales,
      },
    })
  } catch (error) {
    console.error("Error fetching store stats:", error)
    const debug =
      process.env.NODE_ENV !== "production" && error instanceof Error
        ? { debugMessage: error.message }
        : {}
    return NextResponse.json(
      { error: "Erreur lors de la récupération des statistiques", ...debug },
      { status: 500 }
    )
  }
}
