import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"
import {
  createPackProxyProduct,
  findExistingPackIdByCompositionRobust,
  incrementPackProxyStock,
  packCompositionHash,
  productsHasLinkedStorePackIdColumn,
  storePacksHasAssembledStockColumn,
  storePacksHasCompositionHashColumn,
} from "@/lib/store-packs"

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    },
  })
  return user
}

async function assertPackAccess(user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>, storeId: string) {
  const view =
    hasPermission(user, "products.view") ||
    (await hasStorePermission(user.id, storeId, "store.products.view"))
  if (!view) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  }
  return null
}

async function assertPackCreate(user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>, storeId: string) {
  const ok =
    hasPermission(user, "products.create") ||
    hasPermission(user, "products.edit") ||
    (await hasStorePermission(user.id, storeId, "store.products.create")) ||
    (await hasStorePermission(user.id, storeId, "store.products.stock"))
  if (!ok) {
    return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  }
  return null
}

type PackRow = {
  id: string
  store_id: string
  name: string
  description: string | null
  sale_price: number | null
  assembled_stock: number
  created_at: Date
  updated_at: Date
  proxy_sku?: string | null
  proxy_photos?: unknown
  proxy_category_id?: string | null
  proxy_brand_id?: string | null
  category_name?: string | null
  brand_name?: string | null
  proxy_min_stock?: number | null
  proxy_max_stock?: number | null
}

type ItemRow = {
  id: string
  pack_id: string
  product_id: string
  quantity: number
  product_name: string
  product_sku: string | null
  product_photos: string[] | null
  line_unit_price: number
  store_stock: number
  store_min_stock: number
}

function normalizePhotos(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === "string" && u.length > 0)
  }
  return []
}

/** pg peut renvoyer bigint / string ; COALESCE(proxy, col) masque la colonne si proxy.stock = 0 (non NULL). */
function intFromSql(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "bigint") return Number(v)
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0
}

function computePackRowMetrics(
  salePrice: number | null,
  assembledOnHand: number,
  lines: ItemRow[]
): {
  assembledStock: number
  assembleableStock: number
  prixVente: number
  suggestedPrice: number
  stockStatus: "ok" | "low" | "out"
  coverPhoto: string | null
} {
  const onHand = Math.max(0, Math.floor(Number(assembledOnHand) || 0))

  if (lines.length === 0) {
    const pv = salePrice != null && !Number.isNaN(Number(salePrice)) ? Number(salePrice) : 0
    return {
      assembledStock: onHand,
      assembleableStock: 0,
      prixVente: pv,
      suggestedPrice: 0,
      stockStatus: onHand <= 0 ? "out" : "ok",
      coverPhoto: null,
    }
  }

  let assembleable = Number.POSITIVE_INFINITY
  let suggested = 0
  let anyLow = false
  let coverPhoto: string | null = null

  for (const line of lines) {
    const stock = Number(line.store_stock) || 0
    const q = Math.max(1, line.quantity)
    const canMake = Math.floor(stock / q)
    assembleable = Math.min(assembleable, canMake)
    const unit = Number(line.line_unit_price) || 0
    suggested += unit * q
    const minS = Number(line.store_min_stock) || 0
    if (stock > 0 && minS > 0 && stock <= minS) anyLow = true
    if (!coverPhoto) {
      const ph = normalizePhotos(line.product_photos)[0]
      if (ph) coverPhoto = ph
    }
  }

  if (!Number.isFinite(assembleable)) assembleable = 0

  const prixVente =
    salePrice != null && !Number.isNaN(Number(salePrice)) ? Number(salePrice) : suggested

  let stockStatus: "ok" | "low" | "out"
  if (onHand <= 0 && assembleable <= 0) stockStatus = "out"
  else if (anyLow) stockStatus = "low"
  else stockStatus = "ok"

  return {
    assembledStock: onHand,
    assembleableStock: assembleable,
    prixVente,
    suggestedPrice: suggested,
    stockStatus,
    coverPhoto,
  }
}

async function fetchPacksViaSql(storeId: string) {
  const hasAssembledCol = await storePacksHasAssembledStockColumn()
  const hasLinkedCol = await productsHasLinkedStorePackIdColumn()
  const packColExpr = hasAssembledCol
    ? Prisma.sql`COALESCE(sp.assembled_stock, 0)`
    : Prisma.sql`0`

  const packs = hasLinkedCol
    ? await prisma.$queryRaw<PackRow[]>`
        SELECT sp.id, sp.store_id, sp.name, sp.description, sp.sale_price,
          GREATEST(COALESCE(spx.stock, 0), ${packColExpr})::int AS assembled_stock,
          prx.sku AS proxy_sku,
          prx.photos AS proxy_photos,
          prx.category_id AS proxy_category_id,
          prx.brand_id AS proxy_brand_id,
          pc.name AS category_name,
          b.name AS brand_name,
          COALESCE(spx.min_stock, prx.min_stock, 0)::int AS proxy_min_stock,
          spx.max_stock AS proxy_max_stock,
          sp.created_at, sp.updated_at
        FROM store_packs sp
        LEFT JOIN products prx ON prx.linked_store_pack_id = sp.id
        LEFT JOIN product_categories pc ON pc.id = prx.category_id
        LEFT JOIN brands b ON b.id = prx.brand_id
        LEFT JOIN store_products spx
          ON spx.product_id = prx.id AND spx.store_id = sp.store_id
        WHERE sp.store_id = ${storeId}
        ORDER BY sp.created_at DESC
      `
    : await prisma.$queryRaw<PackRow[]>`
        SELECT id, store_id, name, description, sale_price,
          ${hasAssembledCol ? Prisma.sql`COALESCE(assembled_stock, 0)::int AS assembled_stock` : Prisma.sql`0::int AS assembled_stock`},
          created_at, updated_at
        FROM store_packs
        WHERE store_id = ${storeId}
        ORDER BY created_at DESC
      `

  if (packs.length === 0) return []

  const packIds = packs.map((p) => p.id)
  const items = await prisma.$queryRaw<ItemRow[]>`
    SELECT spi.id, spi.pack_id, spi.product_id, spi.quantity,
      pr.name AS product_name, pr.sku AS product_sku, pr.photos AS product_photos,
      COALESCE(sp.prix_vente, pr.prix_vente)::float8 AS line_unit_price,
      COALESCE(sp.stock, 0)::int AS store_stock,
      COALESCE(sp.min_stock, pr.min_stock, 0)::int AS store_min_stock
    FROM store_pack_items spi
    INNER JOIN products pr ON pr.id = spi.product_id
    LEFT JOIN store_products sp
      ON sp.product_id = spi.product_id AND sp.store_id = ${storeId} AND sp.is_active = true
    WHERE spi.pack_id IN (${Prisma.join(packIds)})
  `

  return packs.map((p) => {
    const packItems = items.filter((i) => i.pack_id === p.id)
    const metrics = computePackRowMetrics(p.sale_price, intFromSql(p.assembled_stock), packItems)
    const proxyPhotos = normalizePhotos(p.proxy_photos)
    const listPhoto = proxyPhotos[0] ?? metrics.coverPhoto
    const categoryId = p.proxy_category_id ?? "__pack__"
    const categoryName = p.category_name ?? "Pack"
    const brandId = p.proxy_brand_id ?? null
    const brandName = p.brand_name ?? null
    const sku = p.proxy_sku ?? null
    const minStock = Math.max(0, Math.floor(Number(p.proxy_min_stock) || 0))
    const maxStock =
      p.proxy_max_stock != null && !Number.isNaN(Number(p.proxy_max_stock))
        ? Math.floor(Number(p.proxy_max_stock))
        : null
    return {
      id: p.id,
      storeId: p.store_id,
      name: p.name,
      description: p.description,
      salePrice: p.sale_price,
      assembledStock: metrics.assembledStock,
      categoryId,
      categoryName,
      brandId,
      brandName,
      sku,
      minStock,
      maxStock,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      prixVente: metrics.prixVente,
      suggestedPrice: metrics.suggestedPrice,
      assembleableStock: metrics.assembleableStock,
      stockStatus: metrics.stockStatus,
      coverPhoto: listPhoto,
      items: packItems.map((i) => ({
        id: i.id,
        packId: i.pack_id,
        productId: i.product_id,
        quantity: i.quantity,
        lineUnitPrice: Number(i.line_unit_price) || 0,
        storeStock: Number(i.store_stock) || 0,
        minStock: Number(i.store_min_stock) || 0,
        product: {
          id: i.product_id,
          name: i.product_name,
          sku: i.product_sku,
          photos: normalizePhotos(i.product_photos),
        },
      })),
    }
  })
}

function isMissingPackTablesError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    msg.includes("store_packs") ||
    msg.includes("store_pack_items") ||
    (msg.includes("does not exist") &&
      (msg.includes("store_packs") || msg.includes("store_pack_items")))
  )
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const denied = await assertPackAccess(user, storeId)
    if (denied) return denied

    const packs = await fetchPacksViaSql(storeId)
    return NextResponse.json(packs)
  } catch (error) {
    console.error("GET /api/stores/[id]/packs:", error)
    if (isMissingPackTablesError(error)) {
      return NextResponse.json(
        {
          error:
            "Tables « packs » absentes en base. Exécutez « npx prisma migrate deploy » ou « npx prisma db push ».",
          code: "PACK_TABLES_MISSING",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const denied = await assertPackCreate(user, storeId)
    if (denied) return denied

    const body = await request.json()
    const {
      name,
      description = null,
      salePrice = null,
      assembleCount = 1,
      items,
    } = body as {
      name?: string
      description?: string | null
      salePrice?: number | null
      assembleCount?: number
      items?: { productId: string; quantity: number }[]
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Nom du pack requis" }, { status: 400 })
    }

    if (!items || !Array.isArray(items) || items.length < 2) {
      return NextResponse.json(
        { error: "Ajoutez au moins deux produits au pack" },
        { status: 400 }
      )
    }

    const count = Math.max(1, Math.floor(Number(assembleCount) || 1))
    const raw = items
      .map((row) => ({
        productId: String(row.productId),
        quantity: Math.max(1, Math.floor(Number(row.quantity) || 0)),
      }))
      .filter((r) => r.quantity > 0 && r.productId)

    const mergedQty = new Map<string, number>()
    for (const row of raw) {
      mergedQty.set(row.productId, (mergedQty.get(row.productId) || 0) + row.quantity)
    }
    const normalized = [...mergedQty.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }))

    if (normalized.length < 2) {
      return NextResponse.json(
        { error: "Au moins deux produits distincts avec une quantité valide sont requis" },
        { status: 400 }
      )
    }

    const productIds = normalized.map((i) => i.productId)

    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        productId: { in: productIds },
        isActive: true,
      },
      include: {
        product: { select: { prixVente: true } },
      },
    })

    const spByProduct = new Map(storeProducts.map((sp) => [sp.productId, sp]))

    let suggestedPrice = 0
    for (const line of normalized) {
      const sp = spByProduct.get(line.productId)
      if (!sp) {
        return NextResponse.json(
          { error: `Produit non disponible dans ce magasin (${line.productId})` },
          { status: 400 }
        )
      }
      const unit = sp.prixVente ?? sp.product.prixVente
      suggestedPrice += unit * line.quantity
    }

    for (const line of normalized) {
      const sp = spByProduct.get(line.productId)!
      const need = line.quantity * count
      if (sp.stock < need) {
        return NextResponse.json(
          {
            error: `Stock insuffisant pour un des produits (besoin: ${need}, disponible: ${sp.stock})`,
          },
          { status: 400 }
        )
      }
    }

    const nameTrim = name.trim()
    const descTrim = description && typeof description === "string" ? description.trim() || null : null
    const salePriceNum =
      salePrice != null && !Number.isNaN(Number(salePrice)) ? Number(salePrice) : null

    const hasAssembledCol = await storePacksHasAssembledStockColumn()
    const hasCompHashCol = await storePacksHasCompositionHashColumn()
    const hasLinkedCol = await productsHasLinkedStorePackIdColumn()
    const compositionHash = packCompositionHash(normalized)
    const existingPackId = await findExistingPackIdByCompositionRobust(storeId, compositionHash)

    const now = new Date()

    if (existingPackId) {
      await prisma.$transaction(async (tx) => {
        for (const line of normalized) {
          const sp = spByProduct.get(line.productId)!
          const deduct = line.quantity * count
          await tx.$executeRaw`
            UPDATE store_products
            SET stock = stock - ${deduct}, updated_at = ${now}
            WHERE id = ${sp.id}
          `
        }
        if (hasCompHashCol) {
          await tx.$executeRaw`
            UPDATE store_packs
            SET composition_hash = ${compositionHash}, updated_at = ${now}
            WHERE id = ${existingPackId} AND store_id = ${storeId}
          `
        }
        if (hasAssembledCol) {
          await tx.$executeRaw`
            UPDATE store_packs
            SET assembled_stock = COALESCE(assembled_stock, 0) + ${count}, updated_at = ${now}
            WHERE id = ${existingPackId}
          `
        }
        if (hasLinkedCol) {
          const proxy = await tx.product.findFirst({
            where: { linkedStorePackId: existingPackId },
            select: { id: true },
          })
          if (proxy) {
            await incrementPackProxyStock(tx, storeId, existingPackId, count)
          } else {
            const [meta] = await tx.$queryRaw<
              { name: string; description: string | null; sale_price: number | null }[]
            >`
              SELECT name, description, sale_price FROM store_packs WHERE id = ${existingPackId} LIMIT 1
            `
            let initial = count
            if (hasAssembledCol) {
              const [a] = await tx.$queryRaw<{ c: number }[]>`
                SELECT COALESCE(assembled_stock, 0)::int AS c FROM store_packs WHERE id = ${existingPackId}
              `
              if (a) initial = a.c
            }
            if (meta) {
              await createPackProxyProduct(tx, {
                packId: existingPackId,
                storeId,
                name: meta.name,
                description: meta.description,
                salePrice: meta.sale_price,
                suggestedPrice,
                initialStock: initial,
                templateProductId: normalized[0].productId,
              })
            }
          }
        }
      })

      const enriched = await fetchPacksViaSql(storeId)
      const pack = enriched.find((x) => x.id === existingPackId)
      if (!pack) {
        return NextResponse.json({ error: "Pack mis à jour mais impossible de le relire" }, { status: 200 })
      }
      return NextResponse.json({ ...pack, mergedIntoExisting: true }, { status: 200 })
    }

    const packId = randomUUID()

    await prisma.$transaction(async (tx) => {
      if (hasAssembledCol && hasCompHashCol) {
        await tx.$executeRaw`
          INSERT INTO store_packs (id, store_id, name, description, sale_price, assembled_stock, composition_hash, created_at, updated_at)
          VALUES (${packId}, ${storeId}, ${nameTrim}, ${descTrim}, ${salePriceNum}, ${count}, ${compositionHash}, ${now}, ${now})
        `
      } else if (hasAssembledCol) {
        await tx.$executeRaw`
          INSERT INTO store_packs (id, store_id, name, description, sale_price, assembled_stock, created_at, updated_at)
          VALUES (${packId}, ${storeId}, ${nameTrim}, ${descTrim}, ${salePriceNum}, ${count}, ${now}, ${now})
        `
      } else if (hasCompHashCol) {
        await tx.$executeRaw`
          INSERT INTO store_packs (id, store_id, name, description, sale_price, composition_hash, created_at, updated_at)
          VALUES (${packId}, ${storeId}, ${nameTrim}, ${descTrim}, ${salePriceNum}, ${compositionHash}, ${now}, ${now})
        `
      } else {
        await tx.$executeRaw`
          INSERT INTO store_packs (id, store_id, name, description, sale_price, created_at, updated_at)
          VALUES (${packId}, ${storeId}, ${nameTrim}, ${descTrim}, ${salePriceNum}, ${now}, ${now})
        `
      }

      for (const line of normalized) {
        const itemId = randomUUID()
        await tx.$executeRaw`
          INSERT INTO store_pack_items (id, pack_id, product_id, quantity)
          VALUES (${itemId}, ${packId}, ${line.productId}, ${line.quantity})
        `
      }

      for (const line of normalized) {
        const sp = spByProduct.get(line.productId)!
        const deduct = line.quantity * count
        await tx.$executeRaw`
          UPDATE store_products
          SET stock = stock - ${deduct}, updated_at = ${now}
          WHERE id = ${sp.id}
        `
      }

      if (hasLinkedCol) {
        await createPackProxyProduct(tx, {
          packId,
          storeId,
          name: nameTrim,
          description: descTrim,
          salePrice: salePriceNum,
          suggestedPrice,
          initialStock: count,
          templateProductId: normalized[0].productId,
        })
      }
    })

    const enriched = await fetchPacksViaSql(storeId)
    const pack = enriched.find((x) => x.id === packId)
    if (!pack) {
      return NextResponse.json({ error: "Pack créé mais impossible de le relire" }, { status: 201 })
    }

    return NextResponse.json({ ...pack, mergedIntoExisting: false }, { status: 201 })
  } catch (error) {
    console.error("POST /api/stores/[id]/packs:", error)
    if (isMissingPackTablesError(error)) {
      return NextResponse.json(
        {
          error:
            "Tables « packs » absentes en base. Exécutez « npx prisma migrate deploy » ou « npx prisma db push » puis réessayez.",
          code: "PACK_TABLES_MISSING",
        },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: "Erreur lors de la création du pack" }, { status: 500 })
  }
}
