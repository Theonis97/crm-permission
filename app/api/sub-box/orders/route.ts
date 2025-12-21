import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Créer une nouvelle commande
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
    const { clientCode, totalDiscount, items } = body

    if (!clientCode || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Code client et articles requis" },
        { status: 400 }
      )
    }

    // Récupérer la sous-caisse actuelle
    const currentSubBox = await prisma.subBox.findUnique({
      where: { id: decoded.subBoxId },
      select: { id: true, storeId: true }
    })

    if (!currentSubBox) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse introuvable" },
        { status: 404 }
      )
    }

    try {
      const newOrder = await prisma.$transaction(async (tx) => {
        let subtotal = 0
        let totalItemsCount = 0

        // 1. Calculer les totaux et vérifier les produits
        const orderItemsData = []

        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          })

          if (!product) continue

          const unitPrice = product.prixVente
          const lineTotal = unitPrice * item.quantity

          subtotal += lineTotal
          totalItemsCount += item.quantity

          orderItemsData.push({
            productId: product.id,
            name: product.name,
            sku: product.sku,
            unitPrice: unitPrice,
            quantity: item.quantity,
            total: lineTotal,
          })
        }

        if (orderItemsData.length === 0) {
          throw new Error("Aucun produit valide trouvé")
        }

        // 2. Créer la commande
        const order = await tx.subBoxOrder.create({
          data: {
            subBoxId: currentSubBox.id,
            storeId: currentSubBox.storeId,
            clientCode: clientCode.toUpperCase(),
            totalDiscount: totalDiscount || 0,
            subtotal,
            totalItems: totalItemsCount,
            status: "PENDING",
            items: {
              create: orderItemsData.map(item => ({
                productId: item.productId,
                name: item.name,
                sku: item.sku,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                total: item.total,
              }))
            }
          },
          include: {
            items: true
          }
        })

        return order
      })

      return NextResponse.json({
        success: true,
        data: newOrder,
        message: "Commande créée avec succès",
      })

    } catch (error) {
      console.error("Erreur transaction création commande:", error)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création de la commande" },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("[SUB_BOX_ORDER_CREATE]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}

// PATCH - Modifier une commande de la sous-caisse
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
    const { orderId, clientCode, totalDiscount, items } = body

    if (!orderId || !clientCode) {
      return NextResponse.json(
        { success: false, error: "ID de commande et code client requis" },
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

    // Vérifier et mettre à jour la commande
    // On vérifie d'abord si la commande existe et appartient au même magasin
    const existingOrder = await prisma.subBoxOrder.findFirst({
      where: { 
        id: orderId,
      },
      include: {
        subBox: {
          select: { storeId: true }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable" },
        { status: 404 }
      )
    }

    // Vérification de sécurité : la commande doit appartenir au même magasin
    if (existingOrder.subBox.storeId !== currentSubBox.storeId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé : cette commande appartient à un autre magasin" },
        { status: 403 }
      )
    }

    // Vérifier que la commande est en attente
    if (existingOrder.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Commande non modifiable (statut incorrect)" },
        { status: 400 }
      )
    }

    // Si des articles sont fournis, on fait une mise à jour complète (articles + totaux)
    if (items && Array.isArray(items)) {
      try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
          // 1. Supprimer les anciens articles
          await tx.subBoxOrderItem.deleteMany({
            where: { subBoxOrderId: orderId },
          })

          let subtotal = 0
          let totalItemsCount = 0

          // 2. Créer les nouveaux articles
          for (const item of items) {
            const product = await tx.product.findUnique({
              where: { id: item.productId },
            })

            if (!product) continue

            // Note: Le schéma actuel de SubBoxOrderItem ne supporte pas variantId
            // On utilise donc les infos du produit parent
            const unitPrice = product.prixVente
            const lineTotal = unitPrice * item.quantity

            subtotal += lineTotal
            totalItemsCount += item.quantity

            await tx.subBoxOrderItem.create({
              data: {
                subBoxOrderId: orderId,
                productId: product.id,
                name: product.name,
                sku: product.sku,
                unitPrice: unitPrice,
                quantity: item.quantity,
                total: lineTotal,
              },
            })
          }

          // 3. Mettre à jour la commande avec les nouveaux totaux
          return await tx.subBoxOrder.update({
            where: { id: orderId },
            data: {
              clientCode: clientCode.toUpperCase(),
              totalDiscount: totalDiscount || 0,
              subtotal,
              totalItems: totalItemsCount,
            },
          })
        })

        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message: "Commande mise à jour avec succès",
        })
      } catch (error) {
        console.error("Erreur transaction:", error)
        throw error // Sera attrapé par le catch global
      }
    }

    // Sinon, mise à jour simple (code client et remise uniquement)
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