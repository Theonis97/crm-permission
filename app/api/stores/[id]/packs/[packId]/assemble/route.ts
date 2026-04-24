import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"
import {
  createPackProxyProduct,
  incrementPackProxyStock,
  productsHasLinkedStorePackIdColumn,
} from "@/lib/store-packs"

async function getSessionUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return null
  return prisma.user.findUnique({
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
}

async function assertPackAssemble(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  storeId: string
) {
  const ok =
    hasPermission(user, "products.create") ||
    hasPermission(user, "products.edit") ||
    (await hasStorePermission(user.id, storeId, "store.products.create")) ||
    (await hasStorePermission(user.id, storeId, "store.products.edit")) ||
    (await hasStorePermission(user.id, storeId, "store.products.stock"))
  if (!ok) return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  return null
}

/**
 * POST — Augmenter le stock « pack » en réutilisant la composition enregistrée :
 * débite chaque composant (qté × nombre de packs) et crédite assembled_stock + produit caisse.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { id: storeId, packId } = await params
    const denied = await assertPackAssemble(user, storeId)
    if (denied) return denied

    const body = await request.json().catch(() => ({}))
    const assembleCount = Math.max(1, Math.floor(Number((body as { assembleCount?: number }).assembleCount) || 1))

    const packRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM store_packs WHERE id = ${packId} AND store_id = ${storeId} LIMIT 1
    `
    if (packRows.length === 0) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 })
    }

    const lines = await prisma.$queryRaw<{ product_id: string; quantity: number }[]>`
      SELECT product_id, quantity FROM store_pack_items WHERE pack_id = ${packId}
    `
    if (lines.length < 2) {
      return NextResponse.json({ error: "Composition du pack invalide" }, { status: 400 })
    }

    const productIds = [...new Set(lines.map((l) => l.product_id))]
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
    for (const line of lines) {
      const sp = spByProduct.get(line.product_id)
      if (!sp) {
        return NextResponse.json(
          { error: `Produit non disponible dans ce magasin (${line.product_id})` },
          { status: 400 }
        )
      }
      const unit = sp.prixVente ?? sp.product.prixVente
      suggestedPrice += unit * line.quantity
    }

    for (const line of lines) {
      const sp = spByProduct.get(line.product_id)!
      const need = line.quantity * assembleCount
      if (sp.stock < need) {
        return NextResponse.json(
          {
            error: `Stock insuffisant pour un des produits (besoin: ${need}, disponible: ${sp.stock})`,
          },
          { status: 400 }
        )
      }
    }

    const now = new Date()
    const hasLinkedCol = await productsHasLinkedStorePackIdColumn()

    await prisma.$transaction(async (tx) => {
      for (const line of lines) {
        const sp = spByProduct.get(line.product_id)!
        const deduct = line.quantity * assembleCount
        await tx.$executeRaw`
          UPDATE store_products
          SET stock = stock - ${deduct}, updated_at = ${now}
          WHERE id = ${sp.id}
        `
      }

      // Toujours via Prisma (schéma aligné sur la migration) — évite les faux négatifs information_schema.
      await tx.storePack.update({
        where: { id: packId },
        data: { assembledStock: { increment: assembleCount } },
      })

      if (hasLinkedCol) {
        const proxy = await tx.product.findFirst({
          where: { linkedStorePackId: packId },
          select: { id: true },
        })
        if (proxy) {
          await incrementPackProxyStock(tx, storeId, packId, assembleCount)
        } else {
          const [meta] = await tx.$queryRaw<
            { name: string; description: string | null; sale_price: number | null }[]
          >`
            SELECT name, description, sale_price FROM store_packs WHERE id = ${packId} LIMIT 1
          `
          if (meta) {
            const packRow = await tx.storePack.findUnique({
              where: { id: packId },
              select: { assembledStock: true },
            })
            const initial = packRow?.assembledStock ?? assembleCount
            await createPackProxyProduct(tx, {
              packId,
              storeId,
              name: meta.name,
              description: meta.description,
              salePrice: meta.sale_price,
              suggestedPrice,
              initialStock: initial,
              templateProductId: lines[0].product_id,
            })
          }
        }
      }
    })

    return NextResponse.json({
      ok: true,
      assembleCount,
      message: `${assembleCount} pack(s) ajouté(s) au stock — composants débités.`,
    })
  } catch (e) {
    console.error("POST /packs/[packId]/assemble:", e)
    return NextResponse.json({ error: "Erreur lors de l’assemblage" }, { status: 500 })
  }
}
