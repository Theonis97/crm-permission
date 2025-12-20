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

    // Récupérer les détails de la commande (peut appartenir à n'importe quelle sous-caisse du même magasin)
    const order = await prisma.subBoxOrder.findFirst({
      where: {
        id: orderId,
        storeId: currentSubBox.storeId, // Vérifier que la commande appartient au même magasin
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
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable" },
        { status: 404 }
      )
    }

    // Déterminer l'URL de base pour les images (similaire à l'endpoint produits)
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_API_URL

    // Si on est en production et que l'URL est localhost ou non définie, on force le domaine de prod
    if (process.env.NODE_ENV === "production") {
      if (!baseUrl || baseUrl.includes("localhost")) {
        baseUrl = "https://inotech-gabon.com"
      }
    }

    // Fallback si toujours pas défini
    if (!baseUrl) {
      baseUrl = request.nextUrl.origin || "http://localhost:3000"
    }

    baseUrl = baseUrl.replace(/\/$/, "")

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

        // Construction d'URL complète pour les images
        const getFullImageUrl = (imagePath: string | null | undefined): string | null => {
          if (!imagePath) return null
          
          // Si c'est déjà une URL complète, la retourner telle quelle
          if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
            return imagePath
          }
          
          // Nettoyer le chemin
          let cleanPath = imagePath
          if (cleanPath.startsWith("http://localhost:3000")) {
            cleanPath = cleanPath.replace("http://localhost:3000", "")
          } else if (cleanPath.startsWith("http://localhost:3001")) {
            cleanPath = cleanPath.replace("http://localhost:3001", "")
          }
          
          // S'assurer que le chemin commence par un slash
          cleanPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`
          
          return `${baseUrl}${cleanPath}`
        }

        // Prendre la première photo si disponible et construire l'URL complète
        const imagePath = product?.photos && product.photos.length > 0 ? product.photos[0] : null
        const fullImageUrl = getFullImageUrl(imagePath)

        return {
          ...item,
          image: fullImageUrl,
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