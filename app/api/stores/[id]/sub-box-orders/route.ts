// @ts-nocheck
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
            discount: true,
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
      // Récupérer la commande avec ses items et le retour SAV lié
      const orderWithDetails = await prisma.subBoxOrder.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          productReturn: true,
        }
      })

      // Transaction pour valider la commande et gérer le stock
      const result = await prisma.$transaction(async (tx) => {
        // 1. Mettre à jour le statut de la commande SubBox
        const updatedOrder = await tx.subBoxOrder.update({
          where: { id: orderId },
          data: {
            status: "VALIDATED",
            validatedAt: new Date(),
          },
        })

        // 2. Décrémenter le stock pour chaque item
        for (const item of orderWithDetails?.items || []) {
          // Décrémenter le stock global du produit
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: { decrement: item.quantity }
            }
          })

          // Décrémenter le stock du magasin
          await tx.storeProduct.updateMany({
            where: {
              storeId,
              productId: item.productId,
            },
            data: {
              stock: { decrement: item.quantity }
            }
          })

          console.log(`[SAV] Stock décrémenté: ${item.name} x${item.quantity}`)
        }

        // 3. Si c'est une commande SAV, mettre à jour le ProductReturn
        if (orderWithDetails?.productReturn) {
          await tx.productReturn.update({
            where: { id: orderWithDetails.productReturn.id },
            data: {
              status: "EXCHANGED",
              cashierValidated: true,
              cashierValidatedAt: new Date(),
              cashierValidatedById: session.user?.id,
            }
          })
          console.log(`[SAV] Retour ${orderWithDetails.productReturn.number} marqué comme EXCHANGED`)
        }

        return updatedOrder
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: orderWithDetails?.productReturn 
          ? "Commande SAV validée - Stock décrémenté" 
          : "Commande validée",
      })
    } else if (action === "cancel") {
      // Récupérer la commande avec le retour SAV lié
      const orderWithReturn = await prisma.subBoxOrder.findUnique({
        where: { id: orderId },
        include: {
          productReturn: true,
        }
      })

      // Transaction pour annuler la commande et le retour SAV lié
      const result = await prisma.$transaction(async (tx) => {
        const updatedOrder = await tx.subBoxOrder.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancelReason: cancelReason || null,
          },
        })

        // Si c'est une commande SAV, remettre le retour en attente
        if (orderWithReturn?.productReturn) {
          await tx.productReturn.update({
            where: { id: orderWithReturn.productReturn.id },
            data: {
              status: "PENDING",
              sentToCashier: false,
              savSubBoxOrderId: null,
            }
          })
          console.log(`[SAV] Retour ${orderWithReturn.productReturn.number} remis en attente`)
        }

        return updatedOrder
      })

      return NextResponse.json({
        success: true,
        data: result,
        message: orderWithReturn?.productReturn 
          ? "Commande SAV annulée - Retour remis en attente" 
          : "Commande annulée",
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
