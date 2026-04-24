import { prisma } from "@/lib/prisma"
import { adjustPackAssembledForProxyProduct } from "@/lib/store-packs"

type SavTx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">

/**
 * Vérifie que chaque produit d’échange est bien rattaché au magasin avec assez de stock.
 * À appeler avant création sous-caisse / débit, pour un message d’erreur lisible (souvent le cas des 2ᵉ magasins).
 */
export async function assertExchangeProductsAvailableInStore(
  storeId: string,
  items: Array<{
    exchangeProductId: string | null
    quantity: number
    productName?: string | null
  }>
): Promise<void> {
  for (const item of items) {
    if (!item.exchangeProductId || item.quantity <= 0) continue
    const sp = await prisma.storeProduct.findUnique({
      where: {
        storeId_productId: {
          storeId,
          productId: item.exchangeProductId,
        },
      },
      include: { product: { select: { name: true } } },
    })
    const label =
      sp?.product?.name ?? item.productName ?? "Produit d'échange"
    if (!sp) {
      throw new Error(
        `Magasin : « ${label} » n’est pas dans le catalogue de ce point de vente. Ouvrez Produits du magasin, ajoutez ce produit (ou activez-le), puis refaites l’échange.`
      )
    }
    if (sp.stock < item.quantity) {
      throw new Error(
        `Magasin : stock insuffisant pour « ${label} » (${sp.stock} dispo, ${item.quantity} requis pour l’échange).`
      )
    }
  }
}

/**
 * Débite le stock magasin lors d’un échange SAV (produit donné au client).
 * Échoue clairement si le produit n’est pas dans le magasin ou stock insuffisant.
 */
export async function decrementStoreStockForExchangeOut(
  tx: SavTx,
  args: {
    storeId: string
    productId: string
    quantity: number
    labelForError?: string
  }
): Promise<void> {
  const q = Math.max(1, Math.floor(Number(args.quantity) || 1))
  const sp = await tx.storeProduct.findUnique({
    where: {
      storeId_productId: {
        storeId: args.storeId,
        productId: args.productId,
      },
    },
  })
  if (!sp) {
    throw new Error(
      `Échange impossible : le produit d'échange n'est pas dans l'inventaire de ce magasin. Ajoutez-le aux produits du magasin. ${args.labelForError ? `(${args.labelForError})` : ""}`
    )
  }
  if (sp.stock < q) {
    throw new Error(
      `Stock magasin insuffisant pour l'échange${args.labelForError ? ` : ${args.labelForError}` : ""} (${sp.stock} disponible, ${q} requis).`
    )
  }
  await tx.storeProduct.update({
    where: { id: sp.id },
    data: { stock: { decrement: q } },
  })
  await adjustPackAssembledForProxyProduct(tx, {
    storeId: args.storeId,
    productId: args.productId,
    deltaPackUnits: -q,
  })
}
