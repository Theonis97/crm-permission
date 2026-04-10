import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer le stock d'un livreur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        storeId: true,
        store: {
          select: { id: true, name: true },
        },
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer le stock du livreur
    const stock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId: id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
            photos: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
            attributes: true,
            images: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Calculer la valeur totale du stock
    const totalValue = stock.reduce((sum, item) => {
      const price = item.variant?.prixVente || item.product.prixVente
      return sum + price * item.quantity
    }, 0)

    // Calculer le nombre total d'articles
    const totalItems = stock.reduce((sum, item) => sum + item.quantity, 0)

    // Calculer le nombre de produits en stock faible (disponible <= 5)
    const lowStockCount = stock.filter(item => {
      const available = item.quantity - (item.reserved || 0)
      return available > 0 && available <= 5
    }).length

    return NextResponse.json({
      deliveryPerson: {
        id: deliveryPerson.id,
        name: deliveryPerson.name,
        store: deliveryPerson.store,
      },
      items: stock,
      summary: {
        totalItems,
        totalValue,
        totalProducts: stock.length,
        lowStockCount,
      },
    })
  } catch (error) {
    console.error("[DELIVERY_PERSON_STOCK_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du stock" },
      { status: 500 }
    )
  }
}

// PATCH - Retirer du stock au livreur (avec retour optionnel en magasin)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { stockItemId, quantity, returnToStore = true, notes } = body as {
      stockItemId: string
      quantity: number
      returnToStore?: boolean
      notes?: string
    }

    if (!stockItemId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "stockItemId et quantity sont requis" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } })
    if (!user) return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })

    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
      select: { id: true, name: true, storeId: true, store: { select: { id: true, name: true } } },
    })
    if (!deliveryPerson) return NextResponse.json({ error: "Livreur non trouvé" }, { status: 404 })

    // Vérifier l'item de stock
    const stockItem = await prisma.deliveryPersonStock.findUnique({
      where: { id: stockItemId },
      select: { id: true, deliveryPersonId: true, productId: true, variantId: true, quantity: true },
    })
    if (!stockItem || stockItem.deliveryPersonId !== id) {
      return NextResponse.json({ error: "Article de stock introuvable" }, { status: 404 })
    }
    if (stockItem.quantity < quantity) {
      return NextResponse.json(
        { error: `Quantité insuffisante : ${stockItem.quantity} disponible(s), ${quantity} demandé(s)` },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // 1. Décrémenter le stock du livreur (supprimer l'entrée si qty devient 0)
      if (stockItem.quantity - quantity <= 0) {
        await tx.deliveryPersonStock.delete({ where: { id: stockItemId } })
      } else {
        await tx.deliveryPersonStock.update({
          where: { id: stockItemId },
          data: { quantity: { decrement: quantity } },
        })
      }

      // 2. Mouvement de stock livreur
      await tx.deliveryStockMovement.create({
        data: {
          deliveryPersonId: id,
          productId: stockItem.productId,
          variantId: stockItem.variantId,
          type: "RETURN",
          quantity,
          notes: notes || `Retrait par admin : ${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          createdById: user.id,
        },
      })

      // 3. Retour au stock magasin si demandé
      if (returnToStore) {
        const storeProduct = await tx.storeProduct.findFirst({
          where: { storeId: deliveryPerson.storeId, productId: stockItem.productId },
        })
        if (storeProduct) {
          await tx.storeProduct.update({
            where: { id: storeProduct.id },
            data: { stock: { increment: quantity } },
          })
          await tx.stockMovement.create({
            data: {
              productId: stockItem.productId,
              quantity,
              type: "ENTRY",
              note: `Retour depuis livreur : ${deliveryPerson.name}${notes ? ` — ${notes}` : ""}`,
              userId: user.id,
            },
          })
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `${quantity} unité(s) retirée(s) du stock de ${deliveryPerson.name}${returnToStore ? " et retournée(s) en magasin" : ""}`,
    })
  } catch (error) {
    console.error("[DELIVERY_PERSON_STOCK_PATCH]", error)
    return NextResponse.json({ error: "Erreur lors du retrait du stock" }, { status: 500 })
  }
}

// POST - Ajouter du stock au livreur (approvisionnement depuis le magasin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { productId, variantId, quantity, notes, items } = body

    // Support pour un seul produit OU plusieurs produits
    const productsToTransfer = items ? items : [{ productId, variantId: variantId || null, quantity }]

    if (productsToTransfer.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit à transférer" },
        { status: 400 }
      )
    }

    // Valider que tous les items ont les champs requis
    for (const item of productsToTransfer) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Chaque produit doit avoir un productId et une quantité valide" },
          { status: 400 }
        )
      }
    }

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        storeId: true,
        store: { select: { id: true, name: true } },
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
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

    // Vérifier la disponibilité de tous les produits avant la transaction
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: deliveryPerson.storeId,
        productId: {
          in: productsToTransfer.map((item: { productId: string; variantId?: string | null; quantity: number }) => item.productId),
        },
      },
    })

    // Vérifier que tous les produits existent et ont assez de stock
    for (const item of productsToTransfer) {
      const storeProduct = storeProducts.find(sp => sp.productId === item.productId)
      
      if (!storeProduct) {
        return NextResponse.json(
          { error: `Produit ${item.productId} non trouvé dans le stock du magasin` },
          { status: 404 }
        )
      }

      if (storeProduct.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour le produit ${item.productId}. Disponible: ${storeProduct.stock}, Demandé: ${item.quantity}` },
          { status: 400 }
        )
      }
    }

    // Transaction optimisée pour mettre à jour les stocks et créer les mouvements
    const result = await prisma.$transaction(async (tx) => {
      console.log(`🔄 Starting stock transfer transaction for delivery person ${id}`)
      
      // 1. Récupérer tous les stocks existants du livreur en une seule requête
      const existingDeliveryStocks = await tx.deliveryPersonStock.findMany({
        where: {
          deliveryPersonId: id,
          productId: { in: productsToTransfer.map((item: any) => item.productId) },
        },
      })

      // 2. Préparer les opérations en batch
      const storeProductUpdates = []
      const deliveryPersonStockOps = []
      const stockMovements = []
      const deliveryStockMovements = []
      const transferredItems = []

      for (const item of productsToTransfer) {
        const storeProduct = storeProducts.find(sp => sp.productId === item.productId)!

        // 2a. Préparer la réduction du stock du magasin
        storeProductUpdates.push(
          tx.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        )

        // 2b. Préparer l'augmentation du stock du livreur
        const existingStock = existingDeliveryStocks.find(stock => 
          stock.productId === item.productId && 
          stock.variantId === (item.variantId || null)
        )

        if (existingStock) {
          // Mettre à jour le stock existant
          deliveryPersonStockOps.push(
            tx.deliveryPersonStock.update({
              where: { id: existingStock.id },
              data: {
                quantity: {
                  increment: item.quantity,
                },
              },
              include: {
                product: true,
                variant: true,
              },
            })
          )
        } else {
          // Créer un nouveau stock
          deliveryPersonStockOps.push(
            tx.deliveryPersonStock.create({
              data: {
                deliveryPersonId: id,
                productId: item.productId,
                variantId: item.variantId || null,
                quantity: item.quantity,
              },
              include: {
                product: true,
                variant: true,
              },
            })
          )
        }

        // 2c. Préparer les mouvements de stock
        deliveryStockMovements.push(
          tx.deliveryStockMovement.create({
            data: {
              deliveryPersonId: id,
              productId: item.productId,
              variantId: item.variantId || null,
              type: "SUPPLY",
              quantity: item.quantity,
              notes: notes || "Transfert depuis POS",
              createdById: user.id,
            },
          })
        )

        stockMovements.push(
          tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: -item.quantity,
              type: "EXIT",
              note: `Transfert au livreur: ${deliveryPerson.name}${notes ? ` - ${notes}` : ""}`,
              userId: user.id,
            },
          })
        )
      }

      // 3. Exécuter toutes les opérations en parallèle
      console.log(`🔄 Executing ${storeProductUpdates.length + deliveryPersonStockOps.length + stockMovements.length + deliveryStockMovements.length} operations`)
      
      const [storeUpdates, deliveryUpdates, stockMoves, deliveryMoves] = await Promise.all([
        Promise.all(storeProductUpdates),
        Promise.all(deliveryPersonStockOps),
        Promise.all(stockMovements),
        Promise.all(deliveryStockMovements),
      ])

      console.log(`✅ Stock transfer completed for delivery person ${id}`)
      return deliveryUpdates
    }, {
      timeout: 15000, // Augmenter le timeout à 15 secondes
    })

    return NextResponse.json({ 
      success: true,
      transferred: result.length,
      items: result,
      message: `${result.length} produit(s) transféré(s) avec succès au livreur ${deliveryPerson.name}`
    })
  } catch (error) {
    console.error("[DELIVERY_PERSON_STOCK_POST]", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du stock" },
      { status: 500 }
    )
  }
}
