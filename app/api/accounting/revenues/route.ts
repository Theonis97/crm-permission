import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "today"
    const storeId = searchParams.get("storeId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    let startDate: Date
    let endDate: Date
    const now = new Date()

    if (startDateParam && endDateParam) {
      startDate = new Date(startDateParam)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(endDateParam)
      endDate.setHours(23, 59, 59, 999)
    } else if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    } else if (period === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    } else if (period === "week") {
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0)
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      status: "DELIVERED",
    }

    if (storeId && storeId !== "all") {
      whereClause.storeId = storeId
    }

    const orders = await prisma.storeOrder.findMany({
      where: whereClause,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    const storeRevenuesMap = new Map<string, {
      storeId: string
      storeName: string
      totalRevenue: number
      ordersCount: number
    }>()

    let totalRevenue = 0
    let totalOrders = orders.length

    for (const order of orders) {
      totalRevenue += order.total || 0

      if (order.storeId && order.store) {
        const existing = storeRevenuesMap.get(order.storeId)
        if (existing) {
          existing.totalRevenue += order.total || 0
          existing.ordersCount += 1
        } else {
          storeRevenuesMap.set(order.storeId, {
            storeId: order.storeId,
            storeName: order.store.name,
            totalRevenue: order.total || 0,
            ordersCount: 1,
          })
        }
      }
    }

    const storeRevenues = Array.from(storeRevenuesMap.values())
      .map((store) => ({
        ...store,
        averageOrder: store.ordersCount > 0 ? Math.round(store.totalRevenue / store.ordersCount) : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)

    const averageOrder = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      storeId: storeId || null,
      totalRevenue,
      totalOrders,
      averageOrder,
      storeRevenues,
    })
  } catch (error) {
    console.error("[ACCOUNTING_REVENUES_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des recettes" },
      { status: 500 }
    )
  }
}
