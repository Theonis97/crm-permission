import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

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

    if (!user || !hasPermission(user, "stores.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id: storeId } = await params

    // Récupérer les informations du magasin
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Récupérer les produits avec stock du magasin
    const storeProducts = await prisma.storeProduct.findMany({
      where: { storeId },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
      orderBy: {
        stock: "desc",
      },
    })

    // Récupérer les commandes du magasin
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Commandes en cours
    const ordersInProgress = await prisma.order.findMany({
      where: {
        storeId,
        status: {
          in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Statistiques des commandes
    const totalOrders = await prisma.order.count({
      where: { storeId },
    })

    const pendingOrders = await prisma.order.count({
      where: {
        storeId,
        status: "PENDING",
      },
    })

    const deliveredThisMonth = await prisma.order.count({
      where: {
        storeId,
        status: "DELIVERED",
        deliveredAt: {
          gte: startOfMonth,
        },
      },
    })

    // Calculer le CA mensuel (commandes livrées)
    const deliveredOrders = await prisma.order.findMany({
      where: {
        storeId,
        status: "DELIVERED",
        deliveredAt: {
          gte: startOfMonth,
        },
      },
    })

    const monthlyRevenue = deliveredOrders.reduce((sum, order) => sum + order.total, 0)

    // Top produits vendus ce mois pour ce magasin
    // On récupère les mouvements de sortie (EXIT) liés aux commandes de ce magasin
    const movements = await prisma.stockMovement.findMany({
      where: {
        type: "EXIT",
        createdAt: {
          gte: startOfMonth,
        },
        note: {
          contains: store.name, // Les mouvements contiennent le nom du magasin dans la note
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

    // Grouper par produit et calculer les statistiques
    const productStats = new Map<string, {
      product: any
      totalQuantity: number
      totalRevenue: number
    }>()

    movements.forEach((movement) => {
      const productId = movement.productId
      const quantity = Math.abs(movement.quantity)
      const revenue = quantity * movement.product.prixVente

      if (productStats.has(productId)) {
        const stats = productStats.get(productId)!
        stats.totalQuantity += quantity
        stats.totalRevenue += revenue
      } else {
        productStats.set(productId, {
          product: movement.product,
          totalQuantity: quantity,
          totalRevenue: revenue,
        })
      }
    })

    // Top 10 par quantité
    const topByQuantity = Array.from(productStats.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10)

    // Top 10 par CA
    const topByRevenue = Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10)

    return NextResponse.json({
      store,
      products: storeProducts.map((sp) => ({
        id: sp.product.id,
        name: sp.product.name,
        sku: sp.product.sku,
        stock: sp.stock,
        minStock: sp.minStock,
        maxStock: sp.product.maxStock,
        prixVente: sp.product.prixVente,
        categoryName: sp.product.category?.name,
        brandName: sp.product.brand?.name,
        needsRestock: sp.stock <= sp.minStock,
      })),
      stats: {
        totalProducts: storeProducts.length,
        totalStock: storeProducts.reduce((sum, sp) => sum + sp.stock, 0),
        lowStockProducts: storeProducts.filter((sp) => sp.stock <= sp.minStock).length,
        outOfStockProducts: storeProducts.filter((sp) => sp.stock === 0).length,
        totalOrders,
        pendingOrders,
        ordersInProgress: ordersInProgress.length,
        deliveredThisMonth,
        monthlyRevenue,
      },
      orders: ordersInProgress.map((order) => ({
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total,
        priority: order.priority,
        itemsCount: order.items.length,
        createdAt: order.createdAt,
      })),
      topProducts: {
        byQuantity: topByQuantity.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          categoryName: item.product.category?.name,
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
        })),
        byRevenue: topByRevenue.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          categoryName: item.product.category?.name,
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
        })),
      },
    })
  } catch (error) {
    console.error("Error fetching store dashboard:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    )
  }
}
