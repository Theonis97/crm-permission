import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Annuler une commande et retourner les produits en stock
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { cancellationNote } = body

    if (!cancellationNote || !cancellationNote.trim()) {
      return NextResponse.json(
        { error: "La raison de l'annulation est requise" },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer la commande avec ses items
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier que la commande peut être annulée
    if (order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cette commande est déjà annulée" },
        { status: 400 }
      )
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Une commande livrée ne peut pas être annulée. Utilisez la fonction de retour." },
        { status: 400 }
      )
    }

    // Préparer les données pour la transaction
    const orderNumber = order.number
    const storeId = order.storeId
    const currentNotes = order.notes
    const cancellationTimestamp = new Date().toLocaleString("fr-FR")

    // Transaction pour annuler la commande et retourner les produits en stock
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut de la commande et ajouter la note d'annulation
      const updatedOrder = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: "CANCELLED",
          notes: currentNotes
            ? `${currentNotes}\n\n[Annulation ${cancellationTimestamp}]: ${cancellationNote.trim()}`
            : `[Annulation ${cancellationTimestamp}]: ${cancellationNote.trim()}`,
        },
      })

      const movements = []

      // 2. Pour chaque produit, créer un mouvement de retour et incrémenter le stock
      for (const item of order.items) {
        const { productId, quantity } = item

        // Vérifier si le produit existe dans le stock du magasin
        const storeProduct = await tx.storeProduct.findFirst({
          where: {
            storeId,
            productId,
          },
        })

        if (!storeProduct) {
          // Si le produit n'existe pas dans le stock du magasin, le créer
          await tx.storeProduct.create({
            data: {
              storeId,
              productId,
              stock: quantity,
              minStock: 0,
              maxStock: 0,
            },
          })
        } else {
          // Sinon, incrémenter le stock existant
          await tx.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              stock: {
                increment: quantity,
              },
            },
          })
        }

        // Créer le mouvement de stock (RETURN car annulation = retour en stock)
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            quantity: quantity, // Quantité positive pour un retour
            type: "RETURN",
            note: `Annulation commande ${orderNumber} - ${cancellationNote.trim()}`,
            userId: user.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        })

        movements.push(movement)
      }

      return {
        order: updatedOrder,
        movements,
        totalReturned: order.items.reduce((sum, item) => sum + item.quantity, 0),
      }
    }, {
      maxWait: 5000,
      timeout: 10000,
    })

    return NextResponse.json({
      success: true,
      message: `Commande annulée avec succès. ${result.totalReturned} produit(s) retourné(s) en stock.`,
      order: result.order,
      movements: result.movements,
    })
  } catch (error: any) {
    console.error("[ORDER_CANCEL_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'annulation de la commande" },
      { status: 500 }
    )
  }
}
