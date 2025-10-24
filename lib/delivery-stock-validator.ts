import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export interface OrderItem {
  productId: string
  variantId?: string | null
  quantity: number
}

export interface StockValidationResult {
  valid: boolean
  insufficientItems?: Array<{
    productId: string
    productName: string
    variantId?: string | null
    required: number
    available: number
    missing: number
  }>
  message?: string
}

/**
 * Valide que le livreur a suffisamment de stock pour une commande
 */
export async function validateDeliveryPersonStock(
  deliveryPersonId: string,
  items: OrderItem[]
): Promise<StockValidationResult> {
  try {
    // Récupérer le stock du livreur
    const deliveryStock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Créer un map pour un accès rapide
    const stockMap = new Map<string, { quantity: number; reserved: number; productName: string }>()
    
    deliveryStock.forEach((stock) => {
      const key = `${stock.productId}-${stock.variantId || "null"}`
      stockMap.set(key, {
        quantity: stock.quantity,
        reserved: stock.reserved,
        productName: stock.product.name,
      })
    })

    // Vérifier chaque item de la commande
    const insufficientItems: StockValidationResult["insufficientItems"] = []

    for (const item of items) {
      const key = `${item.productId}-${item.variantId || "null"}`
      const stock = stockMap.get(key)

      if (!stock) {
        insufficientItems.push({
          productId: item.productId,
          productName: "Produit inconnu",
          variantId: item.variantId,
          required: item.quantity,
          available: 0,
          missing: item.quantity,
        })
      } else {
        const available = stock.quantity - stock.reserved
        if (available < item.quantity) {
          insufficientItems.push({
            productId: item.productId,
            productName: stock.productName,
            variantId: item.variantId,
            required: item.quantity,
            available,
            missing: item.quantity - available,
          })
        }
      }
    }

    if (insufficientItems.length > 0) {
      return {
        valid: false,
        insufficientItems,
        message: `Le livreur n'a pas suffisamment de stock pour ${insufficientItems.length} produit(s)`,
      }
    }

    return {
      valid: true,
      message: "Le livreur a suffisamment de stock pour tous les produits",
    }
  } catch (error) {
    console.error("[VALIDATE_DELIVERY_STOCK]", error)
    throw new Error("Erreur lors de la validation du stock")
  }
}

/**
 * Réserve le stock du livreur pour une commande
 */
export async function reserveDeliveryPersonStock(
  deliveryPersonId: string,
  items: OrderItem[]
) {
  try {
    // Réserver le stock pour chaque item
    for (const item of items) {
      await prisma.deliveryPersonStock.updateMany({
        where: {
          deliveryPersonId,
          productId: item.productId,
          variantId: item.variantId || null,
        },
        data: {
          reserved: {
            increment: item.quantity,
          },
        },
      })
    }
  } catch (error) {
    console.error("[RESERVE_DELIVERY_STOCK]", error)
    throw new Error("Erreur lors de la réservation du stock")
  }
}

/**
 * Libère le stock réservé du livreur (en cas d'annulation)
 */
export async function releaseDeliveryPersonStock(
  deliveryPersonId: string,
  items: OrderItem[]
) {
  try {
    // Libérer le stock réservé pour chaque item
    for (const item of items) {
      await prisma.deliveryPersonStock.updateMany({
        where: {
          deliveryPersonId,
          productId: item.productId,
          variantId: item.variantId || null,
        },
        data: {
          reserved: {
            decrement: item.quantity,
          },
        },
      })
    }
  } catch (error) {
    console.error("[RELEASE_DELIVERY_STOCK]", error)
    throw new Error("Erreur lors de la libération du stock")
  }
}

/**
 * Consomme le stock du livreur après livraison (dé-réserve et réduit la quantité)
 * @param tx - Client de transaction Prisma optionnel pour éviter les transactions imbriquées
 */
export async function consumeDeliveryPersonStock(
  deliveryPersonId: string,
  orderId: string,
  items: OrderItem[],
  userId: string,
  tx?: Prisma.TransactionClient
) {
  try {
    // Fonction qui effectue les opérations
    const executeOperations = async (client: any) => {
      for (const item of items) {
        // Réduire le stock et la réservation
        await client.deliveryPersonStock.updateMany({
          where: {
            deliveryPersonId,
            productId: item.productId,
            variantId: item.variantId || null,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
            reserved: {
              decrement: item.quantity,
            },
          },
        })

        // Créer un mouvement de stock (SALE)
        await client.deliveryStockMovement.create({
          data: {
            deliveryPersonId,
            productId: item.productId,
            variantId: item.variantId || null,
            type: "SALE",
            quantity: -item.quantity,
            storeOrderId: orderId,
            createdById: userId || null, // userId doit être un User, pas un DeliveryPerson. Si absent, null.
          },
        })
      }
    }

    // Si un client de transaction est fourni, l'utiliser directement
    // Sinon, créer une nouvelle transaction
    if (tx) {
      await executeOperations(tx)
    } else {
      await prisma.$transaction(async (newTx) => {
        await executeOperations(newTx)
      })
    }
  } catch (error) {
    console.error("[CONSUME_DELIVERY_STOCK]", error)
    throw new Error("Erreur lors de la consommation du stock")
  }
}

/**
 * Obtient un résumé du stock disponible du livreur
 */
export async function getDeliveryPersonAvailableStock(deliveryPersonId: string) {
  try {
    const stock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
          },
        },
      },
    })

    return stock.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productName: item.product.name,
      sku: item.variant?.sku || item.product.sku,
      quantity: item.quantity,
      reserved: item.reserved,
      available: item.quantity - item.reserved,
      price: item.variant?.prixVente || item.product.prixVente,
    }))
  } catch (error) {
    console.error("[GET_DELIVERY_AVAILABLE_STOCK]", error)
    throw new Error("Erreur lors de la récupération du stock disponible")
  }
}
