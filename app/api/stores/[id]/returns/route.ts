import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Enregistrer un retour de produits pour une commande
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { orderId, generalNote, items } = body

    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Paramètres manquants ou invalides" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier que la commande existe et appartient au magasin
    const order = await prisma.storeOrder.findFirst({
      where: {
        id: orderId,
        storeId,
      },
      include: {
        items: {
          include: {
            product: true,
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

    // Valider que tous les produits existent dans la commande
    for (const item of items) {
      const orderItem = order.items.find(oi => oi.productId === item.productId)
      if (!orderItem) {
        return NextResponse.json(
          { error: `Produit ${item.productId} non trouvé dans la commande` },
          { status: 400 }
        )
      }

      if (item.quantity > orderItem.quantity) {
        return NextResponse.json(
          { error: `La quantité de retour pour ${orderItem.product.name} ne peut pas dépasser la quantité commandée` },
          { status: 400 }
        )
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: `La quantité de retour doit être supérieure à 0` },
          { status: 400 }
        )
      }
    }

    // Préparer les données avant la transaction
    const orderNumber = order.number
    const orderNotes = order.notes
    const userId = user.id
    const totalReturned = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const returnTimestamp = new Date().toLocaleString("fr-FR")

    // Transaction pour créer les mouvements de stock et mettre à jour les stocks
    const result = await prisma.$transaction(async (tx) => {
      const movements = []

      for (const item of items) {
        const { productId, quantity, note } = item

        // Vérifier si le produit existe dans le stock du magasin
        const storeProduct = await tx.storeProduct.findFirst({
          where: {
            storeId,
            productId,
          },
        })

        if (!storeProduct) {
          throw new Error(`Le produit ${productId} n'est pas dans le stock du magasin`)
        }

        // Créer le mouvement de stock (RETURN = entrée de stock)
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            quantity: quantity, // Quantité positive pour un retour (entrée)
            type: "RETURN",
            note: note || generalNote || `Retour commande ${orderNumber}`,
            userId: userId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        movements.push(movement)

        // Mettre à jour le stock du produit dans le magasin
        await tx.storeProduct.update({
          where: { id: storeProduct.id },
          data: {
            stock: {
              increment: quantity, // Augmenter le stock (retour = entrée)
            },
          },
        })
      }

      // Enregistrer une note sur la commande si nécessaire
      if (generalNote) {
        await tx.storeOrder.update({
          where: { id: orderId },
          data: {
            notes: orderNotes 
              ? `${orderNotes}\n\n[Retour ${returnTimestamp}]: ${generalNote}`
              : `[Retour ${returnTimestamp}]: ${generalNote}`,
          },
        })
      }

      return { movements, totalReturned }
    }, {
      maxWait: 5000, // Attendre max 5 secondes pour acquérir la transaction
      timeout: 10000, // Timeout de 10 secondes pour la transaction
    })

    return NextResponse.json({
      success: true,
      message: `${result.totalReturned} produit(s) retourné(s) avec succès`,
      movements: result.movements,
    })
  } catch (error: any) {
    console.error("[STORE_RETURNS_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'enregistrement du retour" },
      { status: 500 }
    )
  }
}
