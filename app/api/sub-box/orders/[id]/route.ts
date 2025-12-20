import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les détails d'une commande sous-caisse spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: orderId } = await params

    // Récupérer les détails de la commande avec les informations des produits
    const order = await prisma.subBoxOrder.findFirst({
      where: {
        id: orderId,
        subBoxId: decoded.subBoxId, // S'assurer que la commande appartient à la sous-caisse
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
      },
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable" },
        { status: 404 }
      )
    }

    // Récupérer les images des produits pour chaque item
    const itemsWithImages = await Promise.all(
      order.items.map(async (item) => {
        // Récupérer le produit pour obtenir les photos
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { 
            id: true,
            name: true,
            photos: true,
            sku: true
          },
        })

        // Prendre la première photo si disponible
        const image = product?.photos && product.photos.length > 0 ? product.photos[0] : null

        return {
          ...item,
          image: image,
          productName: product?.name || item.name,
          sku: product?.sku || null,
        }
      })
    )

    // Retourner la commande avec les images
    const orderWithImages = {
      ...order,
      items: itemsWithImages,
    }

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orderWithImages,
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDER_GET]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de la commande" },
      { status: 500 }
    )
  }
}