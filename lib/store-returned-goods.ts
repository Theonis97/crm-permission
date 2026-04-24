import type { Prisma } from "@prisma/client"

/** Origine de l’entrée au stock tampon « retours magasin » */
export const RETURNED_GOODS_SOURCE = {
  SAV_PROCESS: "SAV_PROCESS",
  CASHIER_VALIDATION: "CASHIER_VALIDATION",
  POS_SUB_BOX: "POS_SUB_BOX",
} as const

export type ReturnedGoodsSource =
  (typeof RETURNED_GOODS_SOURCE)[keyof typeof RETURNED_GOODS_SOURCE]

/**
 * Enregistre les produits retournés dans le stock tampon magasin (un enregistrement par ligne de retour).
 * Ne touche pas au stock vendable (store_products) : inventaire séparé pour examen / stats.
 */
export async function recordStoreReturnedGoodsLines(
  tx: Prisma.TransactionClient,
  args: {
    storeId: string
    productReturnId: string
    source: ReturnedGoodsSource
  }
): Promise<void> {
  const ret = await tx.productReturn.findUnique({
    where: { id: args.productReturnId },
    include: { items: true },
  })
  if (!ret || ret.storeId !== args.storeId) return

  const rows = ret.items
    .filter((i) => i.productId != null && i.quantity > 0)
    .map((i) => ({
      storeId: args.storeId,
      productId: i.productId!,
      variantId: i.variantId,
      quantity: i.quantity,
      condition: i.condition,
      productReturnId: ret.id,
      productReturnItemId: i.id,
      source: args.source,
    }))

  if (rows.length === 0) {
    const missingPid = ret.items.filter((i) => !i.productId).length
    if (ret.items.length > 0 && missingPid > 0) {
      console.warn(
        `[SAV] Stock retours ignoré : ${missingPid} ligne(s) sans productId sur le retour ${ret.number}`
      )
    }
    return
  }

  await tx.storeReturnedGoodsLine.createMany({
    data: rows,
    skipDuplicates: true,
  })
}
