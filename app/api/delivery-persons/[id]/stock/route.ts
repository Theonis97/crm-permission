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
      include: {
        store: true,
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

    return NextResponse.json({
      deliveryPerson: {
        id: deliveryPerson.id,
        name: deliveryPerson.name,
        store: deliveryPerson.store,
      },
      stock,
      summary: {
        totalItems,
        totalValue,
        totalProducts: stock.length,
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
      include: { store: true },
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

    // Transaction pour mettre à jour les stocks et créer les mouvements
    const result = await prisma.$transaction(async (tx) => {
      const transferredItems = []

      for (const item of productsToTransfer) {
        const storeProduct = storeProducts.find(sp => sp.productId === item.productId)!

        // 1. Réduire le stock du magasin
        await tx.storeProduct.update({
          where: { id: storeProduct.id },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })

        // 2. Augmenter le stock du livreur
        // Vérifier si le stock existe déjà
        const existingStock = await tx.deliveryPersonStock.findFirst({
          where: {
            deliveryPersonId: id,
            productId: item.productId,
            variantId: item.variantId || null,
          },
        })

        let deliveryStock
        if (existingStock) {
          // Mettre à jour le stock existant
          deliveryStock = await tx.deliveryPersonStock.update({
            where: {
              id: existingStock.id,
            },
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
        } else {
          // Créer un nouveau stock
          deliveryStock = await tx.deliveryPersonStock.create({
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
        }

        // 3. Créer un mouvement de stock pour le livreur (entrée)
        await tx.deliveryStockMovement.create({
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

        // 4. Créer un mouvement de stock pour le magasin (sortie)
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: "EXIT",
            note: `Transfert au livreur: ${deliveryPerson.name}${notes ? ` - ${notes}` : ""}`,
            userId: user.id,
          },
        })

        transferredItems.push(deliveryStock)
      }

      return transferredItems
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
