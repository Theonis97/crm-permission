import { prisma } from "@/lib/prisma"
import { adjustPackAssembledForProxyProduct } from "@/lib/store-packs"

/**
 * Débit stock + mouvements pour une vente POS dont le débit a été différé
 * (commande Mobile Money créée en PENDING avant confirmation paiement).
 * Idempotent : si un mouvement Vente POS avec ce numéro existe déjà, ne fait rien.
 */
export async function applyDeferredPosStockForStoreOrder(orderId: string): Promise<{
  applied: boolean
  skipped: boolean
  error?: string
}> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  })

  if (!order) {
    return { applied: false, skipped: false, error: "Commande introuvable" }
  }

  const saleNumber = order.number
  const tag = `Vente POS ${saleNumber}`

  const existing = await prisma.stockMovement.findFirst({
    where: {
      type: "SALE",
      note: { contains: saleNumber },
    },
  })
  if (existing) {
    return { applied: false, skipped: true }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const line of order.items) {
        if (!line.productId) continue
        const sp = await tx.storeProduct.findFirst({
          where: { storeId: order.storeId, productId: line.productId },
          include: { product: { select: { id: true, name: true, sku: true } } },
        })
        if (!sp) {
          throw new Error(`Produit « ${line.name} » absent du stock magasin`)
        }
        if (sp.stock < line.quantity) {
          throw new Error(
            `Stock insuffisant pour ${sp.product.name}. Disponible: ${sp.stock}, Demandé: ${line.quantity}`,
          )
        }

        await tx.storeProduct.update({
          where: { id: sp.id },
          data: { stock: { decrement: line.quantity } },
        })

        await adjustPackAssembledForProxyProduct(tx, {
          storeId: order.storeId,
          productId: line.productId,
          deltaPackUnits: -line.quantity,
        })

        await tx.stockMovement.create({
          data: {
            productId: line.productId,
            quantity: -line.quantity,
            type: "SALE",
            note: `${tag} - ${order.customerName} (${order.customerPhone}) [mobile après paiement]`,
            userId: order.createdById,
          },
        })
      }
    })
    return { applied: true, skipped: false }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error("[applyDeferredPosStockForStoreOrder]", msg)
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        notes: `${order.notes || ""}\n[ALERTE] Paiement reçu — débit stock à traiter manuellement: ${msg}`.trim(),
      },
    })
    return { applied: false, skipped: false, error: msg }
  }
}
