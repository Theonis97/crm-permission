import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Enregistrer un retour de produits d'un livreur vers le magasin
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
    const { driverId, generalNote, items } = body

    if (!driverId || !items || !Array.isArray(items) || items.length === 0) {
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

    // Vérifier que le livreur existe et appartient au magasin
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: {
        id: driverId,
        storeId,
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé ou n'appartient pas à ce magasin" },
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

    // Vérifier que tous les produits existent dans le stock du livreur
    const driverStock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId: driverId,
        productId: { in: items.map((item: any) => item.productId) },
      },
      include: {
        product: true,
        variant: true,
      },
    })

    for (const item of items) {
      const stockItem = driverStock.find(ds => 
        ds.productId === item.productId && 
        ds.variantId === (item.variantId || null)
      )
      
      if (!stockItem) {
        return NextResponse.json(
          { error: `Produit ${item.productId} non trouvé dans le stock du livreur` },
          { status: 400 }
        )
      }

      if (item.quantity > stockItem.quantity) {
        return NextResponse.json(
          { error: `La quantité de retour pour ${stockItem.product.name} ne peut pas dépasser la quantité en stock (${stockItem.quantity})` },
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
    const driverName = deliveryPerson.name
    const userId = user.id
    const totalReturned = items.reduce((sum: number, item: any) => sum + item.quantity, 0)
    const returnTimestamp = new Date().toLocaleString("fr-FR")

    // Transaction pour créer les mouvements et mettre à jour les stocks
    const result = await prisma.$transaction(async (tx) => {
      const movements = []
      const deliveryMovements = []

      for (const item of items) {
        const { productId, variantId, quantity, note } = item

        // Trouver le stock du livreur
        const driverStockItem = driverStock.find(ds => 
          ds.productId === productId && 
          ds.variantId === (variantId || null)
        )!

        // 1. Réduire le stock du livreur
        await tx.deliveryPersonStock.update({
          where: { id: driverStockItem.id },
          data: {
            quantity: {
              decrement: quantity,
            },
          },
        })

        // 2. Créer le mouvement de stock livreur (RETURN = sortie de stock livreur)
        const deliveryMovement = await tx.deliveryStockMovement.create({
          data: {
            deliveryPersonId: driverId,
            productId,
            variantId: variantId || null,
            type: "RETURN",
            quantity: -quantity, // Quantité négative pour une sortie
            notes: note || generalNote || `Retour au magasin ${store.name}`,
            createdById: userId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            deliveryPerson: {
              select: {
                id: true,
                name: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        deliveryMovements.push(deliveryMovement)

        // 3. Vérifier si le produit existe dans le stock du magasin
        let storeProduct = await tx.storeProduct.findFirst({
          where: {
            storeId,
            productId,
          },
        })

        if (!storeProduct) {
          // Créer l'entrée dans le stock du magasin si elle n'existe pas
          storeProduct = await tx.storeProduct.create({
            data: {
              storeId,
              productId,
              stock: 0,
              minStock: 0,
            },
          })
        }

        // 4. Augmenter le stock du magasin
        await tx.storeProduct.update({
          where: { id: storeProduct.id },
          data: {
            stock: {
              increment: quantity,
            },
          },
        })

        // 5. Créer le mouvement de stock magasin (RETURN = entrée de stock magasin)
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            quantity: quantity, // Quantité positive pour une entrée
            type: "RETURN",
            note: note || generalNote || `Retour du livreur ${driverName}`,
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
      }

      return { movements, deliveryMovements, totalReturned }
    }, {
      maxWait: 5000, // Attendre max 5 secondes pour acquérir la transaction
      timeout: 15000, // Timeout de 15 secondes pour la transaction
    })

    return NextResponse.json({
      success: true,
      message: `${result.totalReturned} produit(s) retourné(s) avec succès depuis le livreur ${driverName}`,
      movements: result.movements,
      deliveryMovements: result.deliveryMovements,
    })
  } catch (error: any) {
    console.error("[STORE_DRIVER_RETURNS_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'enregistrement du retour" },
      { status: 500 }
    )
  }
}
