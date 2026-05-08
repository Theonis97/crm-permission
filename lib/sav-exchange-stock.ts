import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { adjustPackAssembledForProxyProduct } from "@/lib/store-packs"

type SavTx = Prisma.TransactionClient

/**
 * Échange « autre article » au sens métier :
 * - produit d’échange ≠ produit retourné, ou
 * - même produit mais variante d’échange ≠ variante retournée.
 *
 * Dans ces cas, le stock **magasin du produit retourné** peut être à 0 : le retour / l’échange
 * doit quand même être possible (on sort une autre référence ou on gère hors strict remplacement).
 *
 * **Remplacement strict** (même `productId` + même `variantId`, ou les deux sans variante) :
 * on exige du stock sur la ligne magasin pour pouvoir donner une unité neuve au client.
 */
export function isCrossCatalogExchange(
  returnedProductId: string | null | undefined,
  exchangeProductId: string | null | undefined,
  returnedVariantId?: string | null | undefined,
  exchangeVariantId?: string | null | undefined
): boolean {
  if (!returnedProductId || !exchangeProductId) return false
  if (returnedProductId !== exchangeProductId) return true
  const rv = returnedVariantId ?? null
  const ev = exchangeVariantId ?? null
  return rv !== ev
}

/**
 * Vérifie que chaque produit d’échange est bien rattaché au magasin avec assez de stock.
 * À appeler avant création sous-caisse / débit, pour un message d’erreur lisible (souvent le cas des 2ᵉ magasins).
 *
 * Si échange « autre article » (`isCrossCatalogExchange`) : le produit doit exister au magasin,
 * mais le stock peut être à 0. Si remplacement strict même référence : stock ≥ quantité requise.
 */
export async function assertExchangeProductsAvailableInStore(
  storeId: string,
  items: Array<{
    exchangeProductId: string | null
    quantity: number
    productName?: string | null
    /** Produit retourné (ligne SAV) */
    returnedProductId?: string | null
    returnedVariantId?: string | null
    exchangeVariantId?: string | null
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
    const cross = isCrossCatalogExchange(
      item.returnedProductId,
      item.exchangeProductId,
      item.returnedVariantId,
      item.exchangeVariantId
    )
    if (!cross && sp.stock < item.quantity) {
      throw new Error(
        `Échange impossible : remplacement du même article alors que le stock magasin est insuffisant pour « ${label} » (${sp.stock} dispo, ${item.quantity} requis). Choisissez un autre produit d’échange ou approvisionnez le magasin.`
      )
    }
  }
}

/**
 * Débite le stock magasin lors d’un échange SAV (produit donné au client).
 * Échoue clairement si le produit n’est pas dans le magasin ou stock insuffisant
 * (sauf `allowInsufficientStock` pour échange vers un autre produit catalogue).
 */
export async function decrementStoreStockForExchangeOut(
  tx: SavTx,
  args: {
    storeId: string
    productId: string
    quantity: number
    labelForError?: string
    /** Échange A→B avec A≠B : autoriser débit même si stock magasin inférieur à la quantité */
    allowInsufficientStock?: boolean
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
  if (!args.allowInsufficientStock && sp.stock < q) {
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
