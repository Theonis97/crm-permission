// @ts-nocheck

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Liste des commandes d'une sous-caisse
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    // Décoder le token
    let decoded: any
    try {
      decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
    } catch {
      return NextResponse.json(
        { success: false, error: "Token invalide" },
        { status: 401 }
      )
    }

    // Vérifier l'expiration
    if (Date.now() > decoded.expiresAt) {
      return NextResponse.json(
        { success: false, error: "Session expirée" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const date = searchParams.get("date") // Format: YYYY-MM-DD

    // Construire les conditions de recherche
    const whereConditions: any = {
      subBoxId: decoded.subBoxId,
    }

    if (status) {
      whereConditions.status = status
    }

    // Filtrer par date si spécifié
    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      whereConditions.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const orders = await prisma.subBoxOrder.findMany({
      where: whereConditions,
      include: {
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            unitPrice: true,
            discount: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Grouper les commandes par jour
    const ordersByDay: Record<string, any[]> = {}

    for (const order of orders) {
      const dayKey = order.createdAt.toISOString().split("T")[0]
      if (!ordersByDay[dayKey]) {
        ordersByDay[dayKey] = []
      }
      ordersByDay[dayKey].push({
        id: order.id,
        clientCode: order.clientCode,
        status: order.status,
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        totalItems: order.totalItems,
        items: order.items,
        notes: order.notes,
        validatedAt: order.validatedAt,
        cancelledAt: order.cancelledAt,
        cancelReason: order.cancelReason,
        createdAt: order.createdAt,
      })
    }

    // Convertir en tableau trié par date décroissante
    const groupedOrders = Object.entries(ordersByDay)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, orders]) => ({
        date,
        orders,
        count: orders.length,
        total: orders.reduce((sum, o) => sum + (o.subtotal - (o.totalDiscount || 0)), 0),
      }))

    return NextResponse.json({
      success: true,
      data: {
        grouped: groupedOrders,
        total: orders.length,
      },
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDERS_LIST]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    )
  }
}
