import { prisma } from "@/lib/prisma"

export type DriverStorePackItemDto = {
  productId: string
  name: string
  sku: string | null
  photos: string[]
  quantityPerPack: number
  storeStock: number
}

export type DriverStorePackDto = {
  packId: string
  name: string
  description: string | null
  salePrice: number | null
  assembledStock: number
  /** Unités pack prêtes (stock produit proxy au magasin) */
  unitsAvailable: number
  /** Packs supplémentaires réalisables avec les composants en stock magasin */
  assembleableExtraUnits: number
  proxyProductId: string | null
  proxySku: string | null
  proxyName: string | null
  proxyPhotos: string[]
  prixVente: number | null
  items: DriverStorePackItemDto[]
  kind: "pack"
}

/**
 * Packs magasin pour affichage livreur (composition + stocks).
 */
export async function fetchDriverStorePackDtos(
  storeId: string
): Promise<DriverStorePackDto[]> {
  const packs = await prisma.storePack.findMany({
    where: { storeId },
    orderBy: { name: "asc" },
    include: {
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
        },
      },
      proxyProduct: {
        select: {
          id: true,
          name: true,
          sku: true,
          photos: true,
          prixVente: true,
        },
      },
    },
  })

  const componentIds = new Set<string>()
  for (const p of packs) {
    for (const it of p.items) componentIds.add(it.productId)
  }

  const componentStoreRows =
    componentIds.size === 0
      ? []
      : await prisma.storeProduct.findMany({
          where: { storeId, productId: { in: [...componentIds] } },
          select: { productId: true, stock: true },
        })
  const componentStock: Record<string, number> = Object.fromEntries(
    componentStoreRows.map((r) => [r.productId, r.stock])
  )

  const proxyIds = packs
    .map((p) => p.proxyProduct?.id)
    .filter((id): id is string => Boolean(id))

  const proxyStoreRows =
    proxyIds.length === 0
      ? []
      : await prisma.storeProduct.findMany({
          where: { storeId, productId: { in: proxyIds } },
          select: { productId: true, stock: true },
        })
  const proxyStock: Record<string, number> = Object.fromEntries(
    proxyStoreRows.map((r) => [r.productId, r.stock])
  )

  return packs.map((pack) => {
    let assembleable = Number.POSITIVE_INFINITY
    const items: DriverStorePackItemDto[] = pack.items.map((it) => {
      const storeStock = componentStock[it.productId] ?? 0
      const q = Math.max(1, it.quantity)
      assembleable = Math.min(assembleable, Math.floor(storeStock / q))
      const ph = it.product.photos
      const photos = Array.isArray(ph)
        ? ph.filter((u): u is string => typeof u === "string" && u.length > 0)
        : []
      return {
        productId: it.productId,
        name: it.product.name,
        sku: it.product.sku,
        photos,
        quantityPerPack: it.quantity,
        storeStock,
      }
    })
    if (!Number.isFinite(assembleable)) assembleable = 0

    const proxy = pack.proxyProduct
    const proxyProductId = proxy?.id ?? null
    const unitsAvailable = proxyProductId
      ? proxyStock[proxyProductId] ?? 0
      : 0

    const pv =
      proxy?.prixVente != null
        ? Number(proxy.prixVente)
        : pack.salePrice != null
          ? Number(pack.salePrice)
          : null

    const pph = proxy?.photos
    const proxyPhotos = Array.isArray(pph)
      ? pph.filter((u): u is string => typeof u === "string" && u.length > 0)
      : []

    return {
      packId: pack.id,
      name: pack.name,
      description: pack.description,
      salePrice: pack.salePrice,
      assembledStock: pack.assembledStock,
      unitsAvailable,
      assembleableExtraUnits: assembleable,
      proxyProductId,
      proxySku: proxy?.sku ?? null,
      proxyName: proxy?.name ?? null,
      proxyPhotos,
      prixVente: pv,
      items,
      kind: "pack" as const,
    }
  })
}
