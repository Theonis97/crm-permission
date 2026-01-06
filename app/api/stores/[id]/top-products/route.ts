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
    const { searchParams } = new URL(request.url)
    
    // Récupérer le mois et l'année depuis les paramètres (format: YYYY-MM)
    const monthParam = searchParams.get("month")
    const limit = parseInt(searchParams.get("limit") || "30")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Calculer les dates de début et fin du mois
    const now = new Date()
    let startDate: Date
    let endDate: Date
    let isCurrentMonth = false

    if (monthParam) {
      const [year, month] = monthParam.split("-").map(Number)
      startDate = new Date(year, month - 1, 1)
      // Vérifier si c'est le mois en cours
      isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
      if (isCurrentMonth) {
        // Pour le mois en cours, prendre jusqu'à maintenant
        endDate = now
      } else {
        // Pour les mois passés, prendre tout le mois
        endDate = new Date(year, month, 0, 23, 59, 59)
      }
    } else {
      // Par défaut: mois en cours (jusqu'à maintenant)
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = now
      isCurrentMonth = true
    }

    // Récupérer les items de commandes livrées pour la période
    const orderItems = await prisma.storeOrderItem.findMany({
      where: {
        storeOrder: {
          storeId,
          status: "DELIVERED",
          createdAt: {
            gte: startDate,
            ...(isCurrentMonth ? {} : { lte: endDate }),
          },
        },
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        storeOrder: {
          select: {
            createdAt: true,
          },
        },
      },
    })

    // Grouper par produit et calculer les statistiques
    const productSales = new Map<string, {
      product: any
      quantity: number
      revenue: number
      ordersCount: number
    }>()

    orderItems.forEach(item => {
      const productId = item.productId
      if (productSales.has(productId)) {
        const stats = productSales.get(productId)!
        stats.quantity += item.quantity
        stats.revenue += item.total
        stats.ordersCount += 1
      } else {
        productSales.set(productId, {
          product: item.product,
          quantity: item.quantity,
          revenue: item.total,
          ordersCount: 1,
        })
      }
    })

    // Trier par quantité vendue
    const allSortedProducts = Array.from(productSales.values())
      .sort((a, b) => b.quantity - a.quantity)
    
    // Total count avant pagination
    const totalCount = allSortedProducts.length
    
    // Appliquer pagination
    const topProducts = allSortedProducts
      .slice(offset, offset + limit)
      .map((item, index) => ({
        rank: offset + index + 1,
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        photos: item.product.photos,
        quantity: item.quantity,
        revenue: item.revenue,
        ordersCount: item.ordersCount,
        categoryName: item.product.category?.name || "Sans catégorie",
        brandName: item.product.brand?.name || "Sans marque",
        averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0,
      }))

    // Calculer les totaux sur tous les produits
    const totalQuantity = allSortedProducts.reduce((sum, p) => sum + p.quantity, 0)
    const totalRevenue = allSortedProducts.reduce((sum, p) => sum + p.revenue, 0)

    // Générer la liste des 12 derniers mois pour le filtre
    const availableMonths = []
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      availableMonths.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      })
    }

    return NextResponse.json({
      products: topProducts,
      totalCount,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        label: startDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      },
      totals: {
        quantity: totalQuantity,
        revenue: totalRevenue,
        productsCount: totalCount,
      },
      availableMonths,
    })
  } catch (error) {
    console.error("Error fetching top products:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}
