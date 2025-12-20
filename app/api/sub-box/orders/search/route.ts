import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Rechercher des commandes par code client (toutes les sous-caisses du magasin)
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
    const clientCode = searchParams.get("clientCode")

    if (!clientCode) {
      return NextResponse.json(
        { success: false, error: "Code client requis" },
        { status: 400 }
      )
    }

    // Récupérer la sous-caisse actuelle pour obtenir le storeId
    const currentSubBox = await prisma.subBox.findUnique({
      where: { id: decoded.subBoxId },
      select: { storeId: true }
    })

    if (!currentSubBox) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse introuvable" },
        { status: 404 }
      )
    }

    // Rechercher les commandes par code client dans toutes les sous-caisses du magasin
    const orders = await prisma.subBoxOrder.findMany({
      where: {
        storeId: currentSubBox.storeId,
        clientCode: {
          contains: clientCode.toUpperCase(),
          mode: 'insensitive'
        },
        status: "PENDING", // Seulement les commandes en attente
      },
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
        subBox: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Formater les résultats
    const formattedOrders = orders.map(order => ({
      id: order.id,
      clientCode: order.clientCode,
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      totalItems: order.totalItems,
      status: order.status,
      createdAt: order.createdAt,
      items: order.items,
      subBox: order.subBox,
    }))

    // Grouper par jour (même format que la liste normale)
    const ordersByDay: Record<string, any[]> = {}

    for (const order of formattedOrders) {
      const dayKey = new Date(order.createdAt).toISOString().split("T")[0]
      if (!ordersByDay[dayKey]) {
        ordersByDay[dayKey] = []
      }
      ordersByDay[dayKey].push(order)
    }

    // Convertir en tableau formaté
    const groupedOrders = Object.entries(ordersByDay).map(([date, orders]) => ({
      date,
      orders,
      count: orders.length,
      total: orders.reduce((sum, order) => sum + (order.subtotal - (order.totalDiscount || 0)), 0),
    }))

    return NextResponse.json({
      success: true,
      data: groupedOrders,
      message: `Commandes trouvées: ${formattedOrders.length}`,
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDER_SEARCH]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recherche des commandes" },
      { status: 500 }
    )
  }
}