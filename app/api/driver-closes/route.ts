import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateCommission } from "@/lib/commission-calculator"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const driverId = searchParams.get("driverId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")

    if (!storeId) {
      return NextResponse.json({ error: "storeId requis" }, { status: 400 })
    }

    // Construire les filtres
    const where: any = {
      deliveryPerson: {
        storeId: storeId
      }
    }

    if (driverId && driverId !== "all") {
      where.deliveryPersonId = driverId
    }

    if (startDate || endDate) {
      where.deliveredAt = {}
      if (startDate) {
        where.deliveredAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.deliveredAt.lte = new Date(endDate + "T23:59:59.999Z")
      }
    }

    // Récupérer les commandes livrées groupées par livreur et date
    const deliveredOrders = await prisma.storeOrder.findMany({
      where: {
        ...where,
        status: "DELIVERED",
        deliveredAt: {
          not: null
        }
      },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        deliveryZone: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: {
        deliveredAt: 'desc'
      }
    })

    // Grouper par livreur et date de livraison
    const groupedData = new Map()

    deliveredOrders.forEach(order => {
      if (!order.deliveredAt || !order.deliveryPersonId) return

      const deliveryDate = order.deliveredAt.toISOString().split('T')[0]
      const key = `${order.deliveryPersonId}-${deliveryDate}`

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          id: key,
          closeDate: deliveryDate,
          driver: order.deliveryPerson,
          zone: order.deliveryZone,
          orders: [],
          totalDeliveries: 0,
          totalOrders: 0,
          totalRevenue: 0,
          totalCommission: 0,
          createdAt: order.deliveredAt
        })
      }

      const group = groupedData.get(key)
      group.orders.push(order)
      group.totalDeliveries += 1
      group.totalOrders += 1
      group.totalRevenue += order.total || 0
      
      // Calculer la commission selon les règles métier
      const commission = calculateCommission(order.total || 0)
      group.totalCommission += commission
    })

    // Convertir en array et paginer
    const driverCloses = Array.from(groupedData.values())
    const totalItems = driverCloses.length
    const totalPages = Math.ceil(totalItems / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedData = driverCloses.slice(startIndex, endIndex)

    // Calculer les statistiques globales
    const stats = {
      totalDays: driverCloses.length,
      totalDeliveries: driverCloses.reduce((sum, dc) => sum + dc.totalDeliveries, 0),
      totalOrders: driverCloses.reduce((sum, dc) => sum + dc.totalOrders, 0),
      totalRevenue: driverCloses.reduce((sum, dc) => sum + dc.totalRevenue, 0),
      totalCommission: driverCloses.reduce((sum, dc) => sum + dc.totalCommission, 0),
      averageRevenue: driverCloses.length > 0 
        ? driverCloses.reduce((sum, dc) => sum + dc.totalRevenue, 0) / driverCloses.length 
        : 0
    }

    return NextResponse.json({
      driverCloses: paginatedData,
      stats,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    })

  } catch (error) {
    console.error("Erreur lors de la récupération des clôtures:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
