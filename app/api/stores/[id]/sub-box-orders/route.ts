import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Liste des commandes sous-caisse en attente pour un magasin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "PENDING"
    const search = searchParams.get("search") || ""

    console.log("[SUB_BOX_ORDERS] Fetching orders for store:", storeId, "status:", status, "search:", search)

    // Construire les conditions de recherche
    const whereConditions: any = {
      storeId,
      status,
    }

    // Recherche par code client
    if (search) {
      whereConditions.clientCode = {
        contains: search.toUpperCase(),
        mode: "insensitive",
      }
    }

    console.log("[SUB_BOX_ORDERS] Where conditions:", JSON.stringify(whereConditions))

    // D'abord, vérifions toutes les commandes pour ce magasin
    const allOrders = await prisma.subBoxOrder.findMany({
      where: { storeId },
      select: { id: true, status: true, clientCode: true },
    })
    console.log("[SUB_BOX_ORDERS] All orders for store:", allOrders)

    const orders = await prisma.subBoxOrder.findMany({
      where: whereConditions,
      include: {
        subBox: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            total: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    })
  } catch (error) {
    console.error("[STORE_SUB_BOX_ORDERS]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    )
  }
}

// PATCH - Valider ou annuler une commande sous-caisse
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { orderId, action, cancelReason } = body

    if (!orderId || !action) {
      return NextResponse.json(
        { error: "orderId et action requis" },
        { status: 400 }
      )
    }

    // Vérifier que la commande existe et appartient au magasin
    const order = await prisma.subBoxOrder.findFirst({
      where: {
        id: orderId,
        storeId,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      )
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Cette commande a déjà été traitée" },
        { status: 400 }
      )
    }

    if (action === "validate") {
      const updatedOrder = await prisma.subBoxOrder.update({
        where: { id: orderId },
        data: {
          status: "VALIDATED",
          validatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: "Commande validée",
      })
    } else if (action === "cancel") {
      const updatedOrder = await prisma.subBoxOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: cancelReason || null,
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: "Commande annulée",
      })
    } else {
      return NextResponse.json(
        { error: "Action invalide. Utilisez 'validate' ou 'cancel'" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("[STORE_SUB_BOX_ORDER_UPDATE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    )
  }
}
