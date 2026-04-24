import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { decrementStoreStockForExchangeOut } from "@/lib/sav-exchange-stock"
import {
  recordStoreReturnedGoodsLines,
  RETURNED_GOODS_SOURCE,
} from "@/lib/store-returned-goods"

// POST - Valider un retour SAV par la caisse (encaissement ou remboursement)
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
    const { notes } = body

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
            exchangeProduct: true,
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

    // Vérifier que le retour est en attente de validation caisse
    if (productReturn.status !== "AWAITING_CASHIER") {
      return NextResponse.json(
        { error: `Ce retour n'est pas en attente de validation caisse (statut: ${productReturn.status})` },
        { status: 400 }
      )
    }

    // Déterminer le nouveau statut selon le type de résolution
    const newStatus = productReturn.resolutionType === "REFUND" ? "REFUNDED" : "EXCHANGED"

    // Transaction pour mettre à jour le retour et le stock
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le statut du retour
      const updatedReturn = await tx.productReturn.update({
        where: { id: returnId },
        data: {
          status: newStatus,
          cashierValidated: true,
          cashierValidatedAt: new Date(),
          cashierValidatedById: session.user.id,
          resolution: notes 
            ? `${productReturn.resolution || ""} | Caisse: ${notes}` 
            : productReturn.resolution,
        }
      })

      // 2. Gérer le stock selon le type de résolution
      for (const item of productReturn.items) {
        if (productReturn.resolutionType === "EXCHANGE" && item.exchangeProductId) {
          await decrementStoreStockForExchangeOut(tx, {
            storeId,
            productId: item.exchangeProductId,
            quantity: item.quantity,
            labelForError: item.exchangeProduct?.name ?? undefined,
          })

          await tx.stockMovement.create({
            data: {
              productId: item.exchangeProductId,
              quantity: -item.quantity,
              type: "EXIT",
              note: `Échange SAV validé - ${productReturn.trackingNumber || productReturn.number} - Produit donné en échange`,
              userId: session.user.id,
            },
          })

          await tx.product.update({
            where: { id: item.exchangeProductId },
            data: { stock: { decrement: item.quantity } },
          })

          console.log(`[SAV-CAISSE] Échange validé: Sortie de stock pour produit ${item.exchangeProductId} (-${item.quantity})`)
        }

        // NOTE: Le produit retourné n'est PAS remis en stock automatiquement
        // Il doit être examiné et remis en stock manuellement si en bon état
      }

      await recordStoreReturnedGoodsLines(tx, {
        storeId,
        productReturnId: returnId,
        source: RETURNED_GOODS_SOURCE.CASHIER_VALIDATION,
      })

      return updatedReturn
    })

    // Récupérer le retour mis à jour avec toutes les relations
    const finalReturn = await prisma.productReturn.findUnique({
      where: { id: returnId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, photos: true, prixVente: true }
            },
            exchangeProduct: {
              select: { id: true, name: true, photos: true, prixVente: true }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        sentToCashierBy: {
          select: { id: true, name: true, email: true }
        },
        cashierValidatedBy: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    console.log(`[SAV-CAISSE] Retour ${productReturn.trackingNumber || productReturn.number} validé par la caisse - Type: ${productReturn.resolutionType}`)

    return NextResponse.json({
      success: true,
      return: finalReturn,
      message: productReturn.resolutionType === "REFUND" 
        ? `Remboursement de ${productReturn.totalRefundAmount?.toLocaleString()} FCFA effectué`
        : `Échange validé${productReturn.totalCustomerAddition > 0 ? ` - ${productReturn.totalCustomerAddition?.toLocaleString()} FCFA encaissé` : ""}`
    })
  } catch (error: unknown) {
    console.error("Erreur lors de la validation caisse:", error)
    const msg = error instanceof Error ? error.message : "Erreur serveur"
    const isStock =
      msg.includes("magasin") || msg.includes("Stock magasin") || msg.includes("inventaire")
    return NextResponse.json({ error: msg }, { status: isStock ? 400 : 500 })
  }
}
