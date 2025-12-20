import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PATCH - Mettre à jour une commande sous-caisse
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { orderId, clientCode, totalDiscount } = body

    if (!orderId || !clientCode) {
      return NextResponse.json(
        { success: false, error: "ID de commande et code client requis" },
        { status: 400 }
      )
    }

    // Vérifier que la commande existe et appartient à la sous-caisse
    const existingOrder = await prisma.subBoxOrder.findFirst({
      where: {
        id: orderId,
        subBoxId: decoded.subBoxId,
        status: "PENDING", // Seules les commandes en attente peuvent être modifiées
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable ou non modifiable" },
        { status: 404 }
      )
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.subBoxOrder.update({
      where: { id: orderId },
      data: {
        clientCode: clientCode.toUpperCase(),
        totalDiscount: totalDiscount || 0,
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Commande modifiée avec succès",
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDER_UPDATE]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la modification de la commande" },
      { status: 500 }
    )
  }
}

// POST - Créer une commande sous-caisse
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { clientCode, items, notes } = body

    if (!clientCode || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Code client et produits requis" },
        { status: 400 }
      )
    }

    // Vérifier que la sous-caisse existe
    const subBox = await prisma.subBox.findUnique({
      where: { id: decoded.subBoxId },
      include: { store: true },
    })

    if (!subBox || !subBox.isActive) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse invalide ou inactive" },
        { status: 400 }
      )
    }

    // Vérifier le stock et calculer le total
    let subtotal = 0
    let totalItems = 0
    const orderItems: any[] = []

    for (const item of items) {
      // Récupérer le produit avec son stock magasin
      const storeProduct = await prisma.storeProduct.findFirst({
        where: {
          storeId: subBox.storeId,
          productId: item.productId,
        },
        include: {
          product: {
            include: {
              variants: item.variantId ? {
                where: { id: item.variantId }
              } : undefined,
            },
          },
        },
      })

      if (!storeProduct) {
        return NextResponse.json(
          { success: false, error: `Produit introuvable dans ce magasin` },
          { status: 400 }
        )
      }

      const product = storeProduct.product

      // Déterminer le prix et le stock
      let price = storeProduct.prixVente || product.prixVente
      let availableStock = storeProduct.stock
      let variantName = null
      let variantSku = null

      if (item.variantId && product.variants && product.variants.length > 0) {
        const variant = product.variants[0]
        price = variant.prixVente || price
        availableStock = variant.stock
        variantName = variant.name
        variantSku = variant.sku
      }

      // Vérifier le stock
      if (availableStock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Stock insuffisant pour ${product.name}${variantName ? ` (${variantName})` : ''}` },
          { status: 400 }
        )
      }

      const itemTotal = price * item.quantity
      subtotal += itemTotal
      totalItems += item.quantity

      orderItems.push({
        productId: item.productId,
        name: variantName ? `${product.name} - ${variantName}` : product.name,
        sku: variantSku || product.sku,
        quantity: item.quantity,
        unitPrice: price,
        total: itemTotal,
      })
    }

    // Créer la commande sous-caisse
    const order = await prisma.subBoxOrder.create({
      data: {
        subBoxId: subBox.id,
        storeId: subBox.storeId,
        clientCode: clientCode.toUpperCase(),
        status: "PENDING",
        subtotal,
        totalDiscount: body.totalDiscount || 0,
        totalItems,
        notes: notes || null,
        items: {
          create: orderItems,
        },
      },
      include: {
        items: true,
        subBox: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        clientCode: order.clientCode,
        subtotal: order.subtotal,
        totalItems: order.totalItems,
        status: order.status,
        itemsCount: order.items.length,
        subBox: order.subBox,
        createdAt: order.createdAt,
      },
      message: `Commande créée avec le code client: ${order.clientCode}`,
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDER_CREATE]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}
