import { createHash, randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"

export type NormalizedPackLine = { productId: string; quantity: number }

/** Empreinte stable de la composition (triée) pour détecter le « même pack ». */
export function packCompositionHash(lines: NormalizedPackLine[]): string {
  const s = [...lines]
    .sort((a, b) => a.productId.localeCompare(b.productId))
    .map((l) => `${l.productId}:${l.quantity}`)
    .join("|")
  return createHash("sha256").update(s).digest("hex")
}

export async function storePacksHasAssembledStockColumn(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'store_packs'
        AND column_name = 'assembled_stock'
        AND table_schema IN (current_schema(), 'public')
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

export async function storePacksHasCompositionHashColumn(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'store_packs'
        AND column_name = 'composition_hash'
        AND table_schema IN (current_schema(), 'public')
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

export async function productsHasLinkedStorePackIdColumn(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'products'
        AND column_name = 'linked_store_pack_id'
        AND table_schema IN (current_schema(), 'public')
    ) AS exists
  `
  return Boolean(rows[0]?.exists)
}

export async function findExistingPackIdByComposition(
  storeId: string,
  hash: string
): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM store_packs
    WHERE store_id = ${storeId} AND composition_hash = ${hash}
    LIMIT 1
  `
  return rows[0]?.id ?? null
}

/** Fusionne les lignes DB (même produit sur plusieurs lignes) au format normalisé. */
export function normalizePackLinesFromDb(
  rows: { product_id: string; quantity: number }[]
): NormalizedPackLine[] {
  const merged = new Map<string, number>()
  for (const r of rows) {
    const q = Math.max(1, Math.floor(Number(r.quantity) || 0))
    merged.set(r.product_id, (merged.get(r.product_id) || 0) + q)
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }))
}

/**
 * Détecte un pack existant avec la même composition (même magasin), même si
 * `composition_hash` est absent ou non renseigné en base.
 */
export async function findExistingPackIdByCompositionRobust(
  storeId: string,
  hash: string
): Promise<string | null> {
  const hasCol = await storePacksHasCompositionHashColumn()
  if (hasCol) {
    const bySql = await findExistingPackIdByComposition(storeId, hash)
    if (bySql) return bySql
  }

  const packRows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM store_packs WHERE store_id = ${storeId} ORDER BY created_at ASC
  `
  for (const p of packRows) {
    const lines = await prisma.$queryRaw<{ product_id: string; quantity: number }[]>`
      SELECT product_id, quantity FROM store_pack_items WHERE pack_id = ${p.id}
    `
    if (lines.length < 2) continue
    const normalized = normalizePackLinesFromDb(lines)
    if (normalized.length < 2) continue
    if (packCompositionHash(normalized) === hash) return p.id
  }
  return null
}

type Tx = Omit<typeof prisma, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends">

export async function createPackProxyProduct(
  tx: Tx,
  args: {
    packId: string
    storeId: string
    name: string
    description: string | null
    salePrice: number | null
    suggestedPrice: number
    initialStock: number
    templateProductId: string
  }
): Promise<{ proxyProductId: string }> {
  const template = await tx.product.findUnique({
    where: { id: args.templateProductId },
  })
  if (!template) throw new Error("Produit modèle introuvable pour le pack")

  const pv =
    args.salePrice != null && !Number.isNaN(Number(args.salePrice))
      ? Number(args.salePrice)
      : args.suggestedPrice

  const proxyProductId = randomUUID()

  await tx.product.create({
    data: {
      id: proxyProductId,
      name: `[Pack] ${args.name}`,
      sku: `PK-${args.packId.replace(/-/g, "").slice(0, 12)}`,
      description: args.description,
      photos: template.photos ?? [],
      prixVente: pv,
      prixAchat: 0,
      tva: template.tva,
      stock: 0,
      minStock: 0,
      maxStock: null,
      categoryId: template.categoryId,
      brandId: template.brandId,
      linkedStorePackId: args.packId,
    },
  })

  await tx.storeProduct.create({
    data: {
      storeId: args.storeId,
      productId: proxyProductId,
      stock: Math.max(0, Math.floor(args.initialStock)),
      minStock: 0,
      maxStock: null,
      prixVente: pv,
      prixAchat: null,
      isActive: true,
    },
  })

  return { proxyProductId }
}

export async function incrementPackProxyStock(
  tx: Tx,
  storeId: string,
  packId: string,
  delta: number
): Promise<void> {
  if (delta === 0) return
  const proxy = await tx.product.findFirst({
    where: { linkedStorePackId: packId },
    select: { id: true, prixVente: true },
  })
  if (!proxy) return
  const updated = await tx.storeProduct.updateMany({
    where: { storeId, productId: proxy.id },
    data: { stock: { increment: delta } },
  })
  if (updated.count === 0) {
    await tx.storeProduct.create({
      data: {
        storeId,
        productId: proxy.id,
        stock: Math.max(0, Math.floor(delta)),
        minStock: 0,
        maxStock: null,
        prixVente: proxy.prixVente,
        prixAchat: null,
        isActive: true,
      },
    })
  }
}

/**
 * Aligne `store_packs.assembled_stock` quand le stock magasin du produit proxy pack change.
 * deltaPackUnits négatif = vente, positif = retour (annulation, etc.).
 * Sans cela, l’affichage pack utilise GREATEST(proxy, assembled) et reste faux après une vente POS.
 */
export async function adjustPackAssembledForProxyProduct(
  tx: Tx,
  args: { storeId: string; productId: string; deltaPackUnits: number }
): Promise<void> {
  if (!args.deltaPackUnits) return
  const product = await tx.product.findUnique({
    where: { id: args.productId },
    select: { linkedStorePackId: true },
  })
  const packId = product?.linkedStorePackId
  if (!packId) return

  const pack = await tx.storePack.findUnique({
    where: { id: packId },
    select: { storeId: true, assembledStock: true },
  })
  if (!pack || pack.storeId !== args.storeId) return

  const next = Math.max(0, pack.assembledStock + Math.trunc(args.deltaPackUnits))
  await tx.storePack.update({
    where: { id: packId },
    data: { assembledStock: next },
  })
}

/**
 * Dissocie n unités pack au magasin : les composants sont recrédités, le stock proxy et assembled_stock diminuent.
 * Inverse de l’assemblage pour les unités déjà en stock « pack prêt » (proxy / assemblé).
 */
export async function dissociatePackUnitsAtStore(
  tx: Tx,
  args: {
    storeId: string
    packId: string
    units: number
    userId: string
    note?: string | null
  }
): Promise<void> {
  const n = Math.max(0, Math.floor(args.units))
  if (n < 1) throw new Error("Quantité invalide")

  const pack = await tx.storePack.findUnique({
    where: { id: args.packId },
    select: { storeId: true, assembledStock: true },
  })
  if (!pack || pack.storeId !== args.storeId) {
    throw new Error("Pack introuvable")
  }

  const lines = await tx.$queryRaw<{ product_id: string; quantity: number }[]>`
    SELECT product_id, quantity FROM store_pack_items WHERE pack_id = ${args.packId}
  `
  if (lines.length < 1) {
    throw new Error("Composition du pack invalide")
  }

  const proxy = await tx.product.findFirst({
    where: { linkedStorePackId: args.packId },
    select: { id: true },
  })

  let proxyStoreStock = 0
  if (proxy) {
    const spx = await tx.storeProduct.findFirst({
      where: { storeId: args.storeId, productId: proxy.id, isActive: true },
      select: { stock: true },
    })
    proxyStoreStock = Math.max(0, Math.floor(Number(spx?.stock) || 0))
  }

  const rawAssembled = Math.max(0, Math.floor(Number(pack.assembledStock) || 0))
  /**
   * Unités dissociables : aligné sur l’affichage (GREATEST proxy, assemblé) quand il y a un proxy,
   * sinon uniquement l’assemblé magasin — évite « packs prêts » visibles mais dissociation à 0 ou stock proxy négatif.
   */
  const available = proxy ? Math.max(proxyStoreStock, rawAssembled) : rawAssembled

  if (available < n) {
    throw new Error(
      `Stock pack insuffisant pour dissocier (disponible : ${available}, demandé : ${n}).`,
    )
  }

  const now = new Date()
  const noteBase =
    (args.note && args.note.trim()) || `Dissociation pack — ${n} unité(s)`

  for (const line of lines) {
    const sp = await tx.storeProduct.findFirst({
      where: { storeId: args.storeId, productId: line.product_id },
      select: { id: true },
    })
    if (!sp) {
      throw new Error(`Composant absent du magasin (${line.product_id})`)
    }
    const credit = Math.max(1, Math.floor(Number(line.quantity) || 1)) * n
    await tx.$executeRaw`
      UPDATE store_products
      SET stock = stock + ${credit}, updated_at = ${now}
      WHERE id = ${sp.id}
    `
    await tx.stockMovement.create({
      data: {
        productId: line.product_id,
        quantity: credit,
        type: "ADJUSTMENT",
        note: `${noteBase} — retour composant`,
        userId: args.userId,
      },
    })
  }

  if (proxy) {
    const decProxy = Math.min(n, proxyStoreStock)
    if (decProxy > 0) {
      await incrementPackProxyStock(tx, args.storeId, args.packId, -decProxy)
      await tx.stockMovement.create({
        data: {
          productId: proxy.id,
          quantity: -decProxy,
          type: "ADJUSTMENT",
          note: noteBase,
          userId: args.userId,
        },
      })
    }
    await adjustPackAssembledForProxyProduct(tx, {
      storeId: args.storeId,
      productId: proxy.id,
      deltaPackUnits: -n,
    })
  } else {
    await tx.storePack.update({
      where: { id: args.packId },
      data: { assembledStock: Math.max(0, rawAssembled - n) },
    })
  }
}

/** Après PATCH sur store_packs : aligner nom / description / prix du produit caisse. */
export async function syncPackProxyPricing(
  packId: string,
  patch: {
    name?: string
    description?: string | null
    salePrice?: number | null
  }
): Promise<void> {
  const pack = await prisma.storePack.findUnique({
    where: { id: packId },
    select: { storeId: true, salePrice: true },
  })
  if (!pack) return

  const proxy = await prisma.product.findFirst({
    where: { linkedStorePackId: packId },
    select: { id: true, prixVente: true },
  })
  if (!proxy) return

  const resolvedPrice =
    patch.salePrice !== undefined ? patch.salePrice : pack.salePrice
  const pv =
    resolvedPrice != null && !Number.isNaN(Number(resolvedPrice))
      ? Number(resolvedPrice)
      : proxy.prixVente

  await prisma.product.update({
    where: { id: proxy.id },
    data: {
      ...(patch.name !== undefined ? { name: `[Pack] ${patch.name}` } : {}),
      ...(patch.description !== undefined ? { description: patch.description } : {}),
      ...(patch.salePrice !== undefined ? { prixVente: pv } : {}),
    },
  })

  if (patch.salePrice !== undefined) {
    await prisma.storeProduct.updateMany({
      where: { storeId: pack.storeId, productId: proxy.id },
      data: { prixVente: pv },
    })
  }
}
