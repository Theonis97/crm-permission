import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  assertExchangeProductsAvailableInStore,
  decrementStoreStockForExchangeOut,
  isCrossCatalogExchange,
} from "@/lib/sav-exchange-stock"
import {
  recordStoreReturnedGoodsLines,
  RETURNED_GOODS_SOURCE,
} from "@/lib/store-returned-goods"

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
    // PENDING → EXCHANGED / REFUNDED : clôture directe au SAV (débit stock échange + stock retours), sans caisse
    const validTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED", "EXCHANGED", "REFUNDED"],
      APPROVED: ["REFUNDED", "EXCHANGED", "REJECTED"],
      REFUNDED: [],
      EXCHANGED: [],
      REJECTED: [],
      AWAITING_CASHIER: [],
    }

    if (!validTransitions[productReturn.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Transition de ${productReturn.status} vers ${action} non autorisée` },
        { status: 400 }
      )
    }

    const userRow = session.user.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
      : (session.user as { id?: string }).id
        ? await prisma.user.findUnique({
            where: { id: (session.user as { id: string }).id },
            select: { id: true },
          })
        : null
    if (!userRow?.id) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 401 })
    }
    const userId = userRow.id

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

        // NOTE: Le produit retourné n'est PAS remis en stock automatiquement
        // Il doit être examiné avant d'être remis en vente
      }

      resolutionNote = resolutionNote || `Remboursement de ${totalRefundAmount.toLocaleString()} FCFA - Produits en attente d'examen`
    }

    if (action === "EXCHANGED") {
      // Traiter l'échange (items explicites ou lignes déjà renseignées sur le retour)
      const itemsToProcess: ProcessItemInput[] =
        items && items.length > 0
          ? items
          : productReturn.items
              .filter((i) => i.exchangeProductId)
              .map((i) => ({
                itemId: i.id,
                isRefunded: false,
                exchangeProductId: i.exchangeProductId!,
                exchangeProductVariantId: i.exchangeProductVariantId ?? undefined,
                exchangeDiscount: i.exchangeDiscount ?? undefined,
              }))

      if (itemsToProcess.length === 0) {
        return NextResponse.json(
          {
            error:
              "Aucun produit d'échange défini sur ce retour. Sélectionnez un produit d'échange ou passez par la caisse.",
          },
          { status: 400 }
        )
      }

      try {
        await assertExchangeProductsAvailableInStore(
          storeId,
          itemsToProcess.map((p) => {
            const ri = productReturn.items.find((i) => i.id === p.itemId)
            return {
              exchangeProductId: p.exchangeProductId ?? null,
              quantity: ri?.quantity ?? 0,
              productName: ri?.exchangeProductName ?? ri?.productName,
              returnedProductId: ri?.productId ?? null,
              returnedVariantId: ri?.variantId ?? null,
              exchangeVariantId:
                p.exchangeProductVariantId ?? ri?.exchangeProductVariantId ?? null,
            }
          })
        )
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Magasin : vérification stock impossible"
        return NextResponse.json({ error: msg }, { status: 400 })
      }

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

        // NOTE: Le produit retourné n'est PAS remis en stock lors d'un échange
        // Il doit être examiné avant d'être remis en vente
        // Seul le mouvement de sortie du produit d'échange est enregistré

        if (processItem.exchangeProductId) {
          await prisma.$transaction(async (tx) => {
            const cross = isCrossCatalogExchange(
              returnItem.productId,
              processItem.exchangeProductId,
              returnItem.variantId,
              processItem.exchangeProductVariantId ?? null
            )
            await decrementStoreStockForExchangeOut(tx, {
              storeId,
              productId: processItem.exchangeProductId!,
              quantity: returnItem.quantity,
              labelForError: exchangeProductName ?? undefined,
              allowInsufficientStock: cross,
            })

            await tx.stockMovement.create({
              data: {
                productId: processItem.exchangeProductId!,
                quantity: -returnItem.quantity,
                type: "SALE",
                note: `Échange SAV #${productReturn.number} - ${exchangeProductName}`,
                userId,
              },
            })

            await tx.product.update({
              where: { id: processItem.exchangeProductId! },
              data: {
                stock: { decrement: returnItem.quantity },
              },
            })

            if (processItem.exchangeProductVariantId) {
              await tx.productVariant.update({
                where: { id: processItem.exchangeProductVariantId },
                data: {
                  stock: { decrement: returnItem.quantity },
                },
              })
            }
          })
        }

        // NOTE: Le produit retourné n'est PAS remis en stock du magasin
        // Il doit être examiné avant d'être remis en vente
      }

      resolutionNote = resolutionNote || "Produits échangés - Produits retournés en attente d'examen"
    }

    if (action === "APPROVED") {
      resolutionNote = resolutionNote || "Retour approuvé, en attente de résolution"
    }

    if (action === "REJECTED") {
      resolutionNote = resolutionNote || "Retour rejeté"
    }

    // Mettre à jour le statut du retour (+ entrée stock tampon retours si clôture remboursement / échange)
    const updatedReturn = await prisma.$transaction(async (tx) => {
      if (action === "REFUNDED" || action === "EXCHANGED") {
        await recordStoreReturnedGoodsLines(tx, {
          storeId,
          productReturnId: returnId,
          source: RETURNED_GOODS_SOURCE.SAV_PROCESS,
        })
      }

      const resolutionTypeUpdate =
        action === "EXCHANGED"
          ? ("EXCHANGE" as const)
          : action === "REFUNDED"
            ? ("REFUND" as const)
            : undefined

      return tx.productReturn.update({
        where: { id: returnId },
        data: {
          status: action,
          processedById: userId,
          processedAt: new Date(),
          totalRefundAmount,
          resolution: resolutionNote,
          ...(resolutionTypeUpdate
            ? { resolutionType: resolutionTypeUpdate }
            : {}),
        },
        include: {
          storeOrder: {
            select: {
              id: true,
              number: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  photos: true,
                  prixVente: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
              exchangeProduct: {
                select: {
                  id: true,
                  name: true,
                  photos: true,
                  prixVente: true,
                },
              },
              exchangeVariant: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    })

    return NextResponse.json(updatedReturn)
  } catch (error: unknown) {
    console.error("Erreur lors du traitement du retour:", error)
    const msg = error instanceof Error ? error.message : "Erreur serveur"
    const isStock =
      msg.includes("magasin") || msg.includes("Stock magasin") || msg.includes("inventaire")
    return NextResponse.json({ error: msg }, { status: isStock ? 400 : 500 })
  }
}
