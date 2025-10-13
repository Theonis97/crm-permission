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

    if (!user || !hasPermission(user, "warehouses.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    // Récupérer tous les produits avec leurs informations
    const products = await prisma.product.findMany({
      include: {
        category: true,
        brand: true,
      },
    })

    // Calculer les statistiques de stock
    const totalProducts = products.length
    const productsOk = products.filter(p => p.stock > p.minStock && (!p.maxStock || p.stock < p.maxStock)).length
    const productsLowStock = products.filter(p => p.stock > 0 && p.stock <= p.minStock).length
    const productsOutOfStock = products.filter(p => p.stock === 0).length
    const productsOverstocked = products.filter(p => p.maxStock && p.stock >= p.maxStock).length
    const totalQuantity = products.reduce((sum, p) => sum + p.stock, 0)
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.prixAchat), 0)

    // Calculer la valeur du stock par catégorie
    const stockValueByCategory = new Map<string, { name: string, value: number }>()
    products.forEach(product => {
      const categoryName = product.category?.name || "Non catégorisé"
      const value = product.stock * product.prixAchat
      
      if (stockValueByCategory.has(categoryName)) {
        const existing = stockValueByCategory.get(categoryName)!
        existing.value += value
      } else {
        stockValueByCategory.set(categoryName, { name: categoryName, value })
      }
    })

    const stockValueByCategoryData = Array.from(stockValueByCategory.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 catégories

    // Récupérer les commandes en cours (restocking orders)
    const ordersInProgress = await prisma.order.count({
      where: {
        status: {
          in: ["PENDING", "APPROVED", "PREPARING", "SHIPPED"],
        },
      },
    })

    const ordersPending = await prisma.order.count({
      where: {
        status: "PENDING",
      },
    })

    // Récupérer les mouvements des 6 derniers mois
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const movements = await prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      include: {
        product: true,
      },
    })

    // Grouper les mouvements par mois
    const monthlyMovements = new Map<string, { month: string, entries: number, exits: number }>()
    
    movements.forEach(movement => {
      const date = new Date(movement.createdAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })
      
      if (!monthlyMovements.has(monthKey)) {
        monthlyMovements.set(monthKey, { month: monthLabel, entries: 0, exits: 0 })
      }
      
      const data = monthlyMovements.get(monthKey)!
      if (movement.quantity > 0) {
        data.entries += movement.quantity
      } else {
        data.exits += Math.abs(movement.quantity)
      }
    })

    const movementsByMonth = Array.from(monthlyMovements.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, value]) => value)

    // Récupérer les 10 derniers mouvements
    const recentMovements = await prisma.stockMovement.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        product: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // Alertes de stock (produits en rupture ou stock faible)
    const stockAlerts = products
      .filter(p => p.stock === 0 || p.stock <= p.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: p.stock,
        minStock: p.minStock,
        type: p.stock === 0 ? "OUT_OF_STOCK" : "LOW_STOCK",
        severity: p.stock === 0 ? "CRITICAL" : "WARNING",
      }))

    // Statistiques des mouvements
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const movementsToday = await prisma.stockMovement.count({
      where: { createdAt: { gte: startOfToday } },
    })

    const movementsThisWeek = await prisma.stockMovement.count({
      where: { createdAt: { gte: startOfWeek } },
    })

    const movementsThisMonth = await prisma.stockMovement.count({
      where: { createdAt: { gte: startOfMonth } },
    })

    const totalMovements = await prisma.stockMovement.count()

    const entriesThisMonth = movements
      .filter(m => m.quantity > 0 && m.createdAt >= startOfMonth)
      .reduce((sum, m) => sum + m.quantity, 0)

    const exitsThisMonth = movements
      .filter(m => m.quantity < 0 && m.createdAt >= startOfMonth)
      .reduce((sum, m) => sum + Math.abs(m.quantity), 0)

    return NextResponse.json({
      stockStats: {
        totalProducts,
        totalQuantity,
        productsOk,
        productsLowStock,
        productsOutOfStock,
        productsOverstocked,
        totalValue,
      },
      stockValueByCategory: stockValueByCategoryData,
      orderStats: {
        ordersInProgress,
        ordersPending,
      },
      movementStats: {
        totalMovements,
        movementsToday,
        movementsThisWeek,
        movementsThisMonth,
        entriesThisMonth,
        exitsThisMonth,
      },
      movementsByMonth,
      recentMovements: recentMovements.map(m => ({
        id: m.id,
        type: m.quantity > 0 ? "IN" : "OUT",
        productName: m.product.name,
        sku: m.product.sku,
        quantity: Math.abs(m.quantity),
        user: m.user?.firstName && m.user?.lastName 
          ? `${m.user.firstName} ${m.user.lastName}`
          : m.user?.email,
        time: formatTimeAgo(m.createdAt),
        createdAt: m.createdAt,
        note: m.note,
      })),
      stockAlerts,
    })
  } catch (error) {
    console.error("Error fetching warehouse dashboard data:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données" },
      { status: 500 }
    )
  }
}

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return "Il y a quelques secondes"
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `Il y a ${diffInDays}j`
}
