import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * POST /api/restocking-requests/[id]/approve
 * Approuver une demande d'approvisionnement et effectuer le transfert de stock
 */
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
    const { items } = body // items avec quantités approuvées

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur introuvable" },
        { status: 404 }
      )
    }

    // Vérifier que la demande existe et peut être approuvée
    const restockingRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        deliveryPerson: true,
        store: true,
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    })

    if (!restockingRequest) {
      return NextResponse.json(
        { success: false, error: "Demande d'approvisionnement introuvable" },
        { status: 404 }
      )
    }

    if (restockingRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Cette demande a déjà été traitée" },
        { status: 400 }
      )
    }

    // Optimiser la vérification du stock avec une seule requête
    const productIds = items.map((item: any) => {
      const requestItem = restockingRequest.items.find((ri: any) => ri.id === item.id)
      return requestItem?.productId
    }).filter(Boolean)

    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: restockingRequest.storeId,
        productId: { in: productIds },
      },
    })

    const stockValidations: Array<{
      storeProductId: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      requestItemId: string;
    }> = []
    
    for (const item of items) {
      const requestItem = restockingRequest.items.find((ri: any) => ri.id === item.id)
      if (!requestItem) continue

      const storeProduct = storeProducts.find(sp => sp.productId === requestItem.productId)

      if (!storeProduct || storeProduct.stock < item.approvedQuantity) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Stock insuffisant pour ${requestItem.product.name}. Disponible: ${storeProduct?.stock || 0}, Demandé: ${item.approvedQuantity}` 
          },
          { status: 400 }
        )
      }

      stockValidations.push({
        storeProductId: storeProduct.id,
        productId: requestItem.productId,
        variantId: requestItem.variantId,
        quantity: item.approvedQuantity,
        requestItemId: item.id,
      })
    }

    // Transaction optimisée avec timeout augmenté
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log(`🔄 Starting transaction for request ${id}`)
      
      // 1. Mettre à jour la demande et les items en une seule fois
      const updatedRequest = await tx.restockingRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      })

      // 2. Mettre à jour les quantités approuvées des items en parallèle
      await Promise.all(
        items.map((item: any) =>
          tx.restockingRequestItem.update({
            where: { id: item.id },
            data: {
              approvedQuantity: item.approvedQuantity,
            },
          })
        )
      )

      console.log(`✅ Updated request and items for ${id}`)

      // 3. Récupérer tous les stocks existants du livreur en une seule requête
      const existingDeliveryStocks = await tx.deliveryPersonStock.findMany({
        where: {
          deliveryPersonId: restockingRequest.deliveryPersonId,
          productId: { in: stockValidations.map(v => v.productId) },
        },
      })

      // 4. Préparer les opérations de stock en batch
      const storeProductUpdates = []
      const stockMovements = []
      const deliveryStockMovements = []
      const deliveryPersonStockOps = []

      for (const validation of stockValidations) {
        // 4a. Préparer la sortie du stock du magasin
        storeProductUpdates.push(
          tx.storeProduct.update({
            where: { id: validation.storeProductId },
            data: {
              stock: {
                decrement: validation.quantity,
              },
            },
          })
        )

        // 4b. Préparer le mouvement de sortie magasin
        stockMovements.push(
          tx.stockMovement.create({
            data: {
              productId: validation.productId,
              quantity: -validation.quantity, // Négatif = sortie
              type: "TRANSFER_OUT",
              note: `Transfert vers livreur ${restockingRequest.deliveryPerson.name} - Demande ${id}`,
              userId: user.id,
            },
          })
        )

        // 4c. Préparer l'entrée dans le stock du livreur
        const existingStock = existingDeliveryStocks.find(stock => 
          stock.productId === validation.productId && 
          stock.variantId === validation.variantId
        )

        if (existingStock) {
          deliveryPersonStockOps.push(
            tx.deliveryPersonStock.update({
              where: { id: existingStock.id },
              data: {
                quantity: {
                  increment: validation.quantity,
                },
              },
            })
          )
        } else {
          deliveryPersonStockOps.push(
            tx.deliveryPersonStock.create({
              data: {
                deliveryPersonId: restockingRequest.deliveryPersonId,
                productId: validation.productId,
                variantId: validation.variantId,
                quantity: validation.quantity,
              },
            })
          )
        }

        // 4d. Préparer le mouvement d'entrée livreur
        deliveryStockMovements.push(
          tx.deliveryStockMovement.create({
            data: {
              deliveryPersonId: restockingRequest.deliveryPersonId,
              productId: validation.productId,
              variantId: validation.variantId,
              type: "SUPPLY",
              quantity: validation.quantity, // Positif = entrée
              notes: `Approvisionnement depuis magasin - Demande ${id}`,
              createdById: user.id,
            },
          })
        )
      }

      // Exécuter toutes les opérations de stock en parallèle
      console.log(`🔄 Executing stock operations for ${id}`)
      await Promise.all([
        ...storeProductUpdates,
        ...stockMovements,
        ...deliveryPersonStockOps,
        ...deliveryStockMovements,
      ])

      console.log(`✅ Completed stock operations for ${id}`)

      // 4. Marquer la demande comme terminée
      await tx.restockingRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })

      console.log(`✅ Transaction completed for ${id}`)
      return updatedRequest
    }, {
      timeout: 15000, // Augmenter le timeout à 15 secondes
    })

    // Récupérer la demande complète mise à jour
    const completeRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                attributes: true,
              },
            },
          },
        },
      },
    })

    console.log(`✅ Demande d'approvisionnement ${id} approuvée et stock transféré`)
    console.log(`📦 ${stockValidations.length} produits transférés vers ${restockingRequest.deliveryPerson.name}`)

    return NextResponse.json({
      success: true,
      message: "Demande approuvée et stock transféré avec succès",
      data: completeRequest,
    })
  } catch (error) {
    console.error("❌ Approve restocking request error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'approbation de la demande" },
      { status: 500 }
    )
  }
}
