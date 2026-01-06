import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Interface pour les items lors du traitement
interface ProcessItemInput {
  itemId: string
  isRefunded: boolean // true = remboursement, false = échange
  refundAmount?: number // Montant du remboursement si isRefunded = true
  exchangeProductId?: string // Produit d'échange si isRefunded = false
  exchangeProductVariantId?: string // Variante du produit d'échange
  exchangeDiscount?: number // Remise sur le produit d'échange
}

// POST - Traiter un retour (approuver, rembourser, échanger, rejeter)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId, returnId } = await params
    const body = await request.json()
    const { 
      action, // APPROVED, REFUNDED, EXCHANGED, REJECTED
      items, // Détails des items pour REFUNDED ou EXCHANGED
      resolution // Note de résolution optionnelle
    } = body

    // Vérifier que le retour existe et appartient au magasin
    const productReturn = await prisma.productReturn.findFirst({
      where: {
        id: returnId,
        storeId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          }
        }
      }
    })

    if (!productReturn) {
      return NextResponse.json(
        { error: "Retour non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier les transitions de statut valides
    const validTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["REFUNDED", "EXCHANGED", "REJECTED"],
      REFUNDED: [],
      EXCHANGED: [],
      REJECTED: [],
    }

    if (!validTransitions[productReturn.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Transition de ${productReturn.status} vers ${action} non autorisée` },
        { status: 400 }
      )
    }

    let totalRefundAmount = 0
    let resolutionNote = resolution || ""

    // Traitement selon l'action
    if (action === "REFUNDED") {
      // Traiter le remboursement
      const itemsToProcess: ProcessItemInput[] = items || []
      
      for (const item of productReturn.items) {
        const processItem = itemsToProcess.find(i => i.itemId === item.id)
        const refundAmount = processItem?.refundAmount ?? (item.quantity * item.unitPrice)
        
        // Mettre à jour l'item avec le montant de remboursement
        await prisma.productReturnItem.update({
          where: { id: item.id },
          data: {
            isRefunded: true,
            refundAmount,
          }
        })

        totalRefundAmount += refundAmount

        // Créer un mouvement de stock entrant (RETURN)
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity, // Positif = entrée
            type: "RETURN",
            note: `Retour SAV #${productReturn.number} - ${item.productName}`,
            userId: session.user.id,
          }
        })

        // Mettre à jour le stock du produit principal
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.quantity }
          }
        })

        // Mettre à jour le stock de la variante si applicable
        if (item.variantId) {
          await prisma.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: { increment: item.quantity }
            }
          })
        }

        // Mettre à jour le stock du magasin si StoreProduct existe
        const storeProduct = await prisma.storeProduct.findUnique({
          where: {
            storeId_productId: {
              storeId,
              productId: item.productId,
            }
          }
        })

        if (storeProduct) {
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              stock: { increment: item.quantity }
            }
          })
        }
      }

      resolutionNote = resolutionNote || `Remboursement de ${totalRefundAmount.toLocaleString()} FCFA - Produits remis en stock`
    }

    if (action === "EXCHANGED") {
      // Traiter l'échange
      const itemsToProcess: ProcessItemInput[] = items || []
      
      for (const processItem of itemsToProcess) {
        const returnItem = productReturn.items.find(i => i.id === processItem.itemId)
        if (!returnItem) continue

        // Récupérer les infos du produit d'échange
        let exchangeProductName = null
        if (processItem.exchangeProductId) {
          const exchangeProduct = await prisma.product.findUnique({
            where: { id: processItem.exchangeProductId },
            select: { name: true }
          })
          
          if (processItem.exchangeProductVariantId) {
            const exchangeVariant = await prisma.productVariant.findUnique({
              where: { id: processItem.exchangeProductVariantId },
              select: { name: true }
            })
            exchangeProductName = exchangeVariant?.name || exchangeProduct?.name
          } else {
            exchangeProductName = exchangeProduct?.name
          }
        }

        // Mettre à jour l'item avec les infos d'échange
        await prisma.productReturnItem.update({
          where: { id: processItem.itemId },
          data: {
            isRefunded: false,
            exchangeProductId: processItem.exchangeProductId || null,
            exchangeProductVariantId: processItem.exchangeProductVariantId || null,
            exchangeProductName,
            exchangeDiscount: processItem.exchangeDiscount || 0,
          }
        })

        // Remettre le produit retourné en stock
        await prisma.stockMovement.create({
          data: {
            productId: returnItem.productId,
            quantity: returnItem.quantity,
            type: "RETURN",
            note: `Retour SAV #${productReturn.number} (échange) - ${returnItem.productName}`,
            userId: session.user.id,
          }
        })

        await prisma.product.update({
          where: { id: returnItem.productId },
          data: {
            stock: { increment: returnItem.quantity }
          }
        })

        if (returnItem.variantId) {
          await prisma.productVariant.update({
            where: { id: returnItem.variantId },
            data: {
              stock: { increment: returnItem.quantity }
            }
          })
        }

        // Décrémenter le stock du produit d'échange
        if (processItem.exchangeProductId) {
          await prisma.stockMovement.create({
            data: {
              productId: processItem.exchangeProductId,
              quantity: -returnItem.quantity, // Négatif = sortie
              type: "SALE",
              note: `Échange SAV #${productReturn.number} - ${exchangeProductName}`,
              userId: session.user.id,
            }
          })

          await prisma.product.update({
            where: { id: processItem.exchangeProductId },
            data: {
              stock: { decrement: returnItem.quantity }
            }
          })

          if (processItem.exchangeProductVariantId) {
            await prisma.productVariant.update({
              where: { id: processItem.exchangeProductVariantId },
              data: {
                stock: { decrement: returnItem.quantity }
              }
            })
          }

          // Mettre à jour le stock du magasin pour le produit d'échange
          const storeExchangeProduct = await prisma.storeProduct.findUnique({
            where: {
              storeId_productId: {
                storeId,
                productId: processItem.exchangeProductId,
              }
            }
          })

          if (storeExchangeProduct) {
            await prisma.storeProduct.update({
              where: { id: storeExchangeProduct.id },
              data: {
                stock: { decrement: returnItem.quantity }
              }
            })
          }
        }

        // Mettre à jour le stock du magasin pour le produit retourné
        const storeProduct = await prisma.storeProduct.findUnique({
          where: {
            storeId_productId: {
              storeId,
              productId: returnItem.productId,
            }
          }
        })

        if (storeProduct) {
          await prisma.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              stock: { increment: returnItem.quantity }
            }
          })
        }
      }

      resolutionNote = resolutionNote || "Produits échangés"
    }

    if (action === "APPROVED") {
      resolutionNote = resolutionNote || "Retour approuvé, en attente de résolution"
    }

    if (action === "REJECTED") {
      resolutionNote = resolutionNote || "Retour rejeté"
    }

    // Mettre à jour le statut du retour
    const updatedReturn = await prisma.productReturn.update({
      where: { id: returnId },
      data: {
        status: action,
        processedById: session.user.id,
        processedAt: new Date(),
        totalRefundAmount,
        resolution: resolutionNote,
      },
      include: {
        storeOrder: {
          select: {
            id: true,
            number: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            },
            exchangeProduct: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              }
            },
            exchangeVariant: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(updatedReturn)
  } catch (error: any) {
    console.error("Erreur lors du traitement du retour:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
