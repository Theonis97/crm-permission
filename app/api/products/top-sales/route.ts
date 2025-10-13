import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
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

    if (!user || !hasPermission(user, "products.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const sortBy = searchParams.get("sortBy") || "quantity" // quantity or revenue
    const limit = parseInt(searchParams.get("limit") || "10")

    // Calculer le début du mois actuel
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Récupérer tous les mouvements de sortie (EXIT) du mois en cours
    const movements = await prisma.stockMovement.findMany({
      where: {
        type: "EXIT",
        createdAt: {
          gte: startOfMonth,
        },
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
    })

    // Grouper les mouvements par produit et calculer les statistiques
    const productStats = new Map<string, {
      product: any
      totalQuantity: number
      totalRevenue: number
    }>()

    movements.forEach((movement) => {
      const productId = movement.productId
      const quantity = Math.abs(movement.quantity) // Les sorties sont négatives
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

    // Convertir en tableau et trier
    let topProducts = Array.from(productStats.values())

    if (sortBy === "revenue") {
      topProducts.sort((a, b) => b.totalRevenue - a.totalRevenue)
    } else {
      topProducts.sort((a, b) => b.totalQuantity - a.totalQuantity)
    }

    // Limiter aux N premiers
    topProducts = topProducts.slice(0, limit)

    return NextResponse.json({
      products: topProducts.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        categoryName: item.product.category?.name,
        brandName: item.product.brand?.name,
        prixVente: item.product.prixVente,
        stock: item.product.stock,
        totalQuantity: item.totalQuantity,
        totalRevenue: item.totalRevenue,
      })),
      period: {
        startDate: startOfMonth.toISOString(),
        endDate: now.toISOString(),
      },
    })
  } catch (error) {
    console.error("Error fetching top sales products:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}
