import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { fetchDriverStorePackDtos } from "@/lib/driver-store-packs"

/**
 * GET /api/delivery-persons/[id]/available-products
 * Récupérer les produits disponibles dans le magasin pour un livreur
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: deliveryPersonId } = await params

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
      select: {
        id: true,
        name: true,
        storeId: true,
        store: { select: { id: true, name: true } },
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { success: false, error: "Livreur introuvable" },
        { status: 404 }
      )
    }

    // Récupérer les produits disponibles dans le magasin du livreur
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: deliveryPerson.storeId,
        stock: {
          gt: 0, // Seulement les produits en stock
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            description: true,
            photos: true,
            prixVente: true,
            linkedStorePackId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
            variants: {
              where: {
                isActive: true,
              },
              select: {
                id: true,
                name: true,
                sku: true,
                attributes: true,
                prixVente: true,
                images: true,
              },
            },
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    })

    // Récupérer le stock actuel du livreur pour comparaison
    const deliveryPersonStock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId,
      },
      select: {
        productId: true,
        variantId: true,
        quantity: true,
        reserved: true,
      },
    })

    // Créer un map pour un accès rapide au stock du livreur
    const deliveryStockMap = new Map()
    deliveryPersonStock.forEach((stock) => {
      const key = `${stock.productId}-${stock.variantId || "null"}`
      deliveryStockMap.set(key, {
        quantity: stock.quantity,
        reserved: stock.reserved,
        available: stock.quantity - stock.reserved,
      })
    })

    const packs = await fetchDriverStorePackDtos(deliveryPerson.storeId)

    // Formater les données pour la réponse (hors produits proxy pack : listés dans `packs`)
    const availableProducts = storeProducts
      .filter((sp) => !sp.product.linkedStorePackId)
      .map((storeProduct) => {
      const product = storeProduct.product
      const deliveryStockKey = `${product.id}-null`
      const deliveryStock = deliveryStockMap.get(deliveryStockKey) || {
        quantity: 0,
        reserved: 0,
        available: 0,
      }

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        photos: product.photos,
        prixVente: storeProduct.prixVente || product.prixVente,
        category: product.category,
        brand: product.brand,
        storeStock: storeProduct.stock,
        deliveryPersonStock: deliveryStock,
        variants: product.variants.map((variant) => {
          const variantStockKey = `${product.id}-${variant.id}`
          const variantDeliveryStock = deliveryStockMap.get(variantStockKey) || {
            quantity: 0,
            reserved: 0,
            available: 0,
          }

          return {
            ...variant,
            deliveryPersonStock: variantDeliveryStock,
          }
        }),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        deliveryPerson: {
          id: deliveryPerson.id,
          name: deliveryPerson.name,
          store: {
            id: deliveryPerson.store.id,
            name: deliveryPerson.store.name,
          },
        },
        products: availableProducts,
        packs,
      },
    })
  } catch (error) {
    console.error("❌ Get available products error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}
