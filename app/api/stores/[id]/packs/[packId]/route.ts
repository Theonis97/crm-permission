import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"
import { syncPackProxyPricing } from "@/lib/store-packs"

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

async function assertPackView(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  storeId: string
) {
  const ok =
    hasPermission(user, "products.view") ||
    (await hasStorePermission(user.id, storeId, "store.products.view"))
  if (!ok) return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  return null
}

async function assertPackEdit(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  storeId: string
) {
  const ok =
    hasPermission(user, "products.edit") ||
    hasPermission(user, "products.create") ||
    (await hasStorePermission(user.id, storeId, "store.products.edit")) ||
    (await hasStorePermission(user.id, storeId, "store.products.create"))
  if (!ok) return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  return null
}

async function assertPackDelete(
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>,
  storeId: string
) {
  const ok =
    hasPermission(user, "products.delete") ||
    (await hasStorePermission(user.id, storeId, "store.products.delete"))
  if (!ok) return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
  return null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { id: storeId, packId } = await params
    const denied = await assertPackEdit(user, storeId)
    if (denied) return denied

    const body = await request.json()
    const { name, description, salePrice } = body as {
      name?: string
      description?: string | null
      salePrice?: number | null
    }

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM store_packs WHERE id = ${packId} AND store_id = ${storeId} LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 })
    }

    if (name === undefined && description === undefined && salePrice === undefined) {
      return NextResponse.json({ error: "Aucun champ à modifier" }, { status: 400 })
    }

    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 })
    }

    const now = new Date()
    const nameTrim = name !== undefined ? name.trim() : undefined
    const descVal =
      description === undefined
        ? undefined
        : description === null || description === ""
          ? null
          : String(description).trim() || null
    const priceVal =
      salePrice === undefined
        ? undefined
        : salePrice === null || salePrice === ""
          ? null
          : Number(salePrice)

    if (priceVal !== undefined && priceVal !== null && Number.isNaN(priceVal)) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 })
    }

    if (nameTrim !== undefined) {
      await prisma.$executeRaw`
        UPDATE store_packs
        SET name = ${nameTrim}, updated_at = ${now}
        WHERE id = ${packId} AND store_id = ${storeId}
      `
    }
    if (descVal !== undefined) {
      await prisma.$executeRaw`
        UPDATE store_packs
        SET description = ${descVal}, updated_at = ${now}
        WHERE id = ${packId} AND store_id = ${storeId}
      `
    }
    if (priceVal !== undefined) {
      await prisma.$executeRaw`
        UPDATE store_packs
        SET sale_price = ${priceVal}, updated_at = ${now}
        WHERE id = ${packId} AND store_id = ${storeId}
      `
    }

    try {
      await syncPackProxyPricing(packId, {
        ...(nameTrim !== undefined ? { name: nameTrim } : {}),
        ...(descVal !== undefined ? { description: descVal } : {}),
        ...(priceVal !== undefined ? { salePrice: priceVal } : {}),
      })
    } catch (syncErr) {
      console.warn("PATCH pack: sync produit caisse (proxy)", syncErr)
    }

    const [updated] = await prisma.$queryRaw<
      {
        id: string
        store_id: string
        name: string
        description: string | null
        sale_price: number | null
        created_at: Date
        updated_at: Date
      }[]
    >`
      SELECT id, store_id, name, description, sale_price, created_at, updated_at
      FROM store_packs
      WHERE id = ${packId} AND store_id = ${storeId}
    `

    return NextResponse.json({
      id: updated.id,
      storeId: updated.store_id,
      name: updated.name,
      description: updated.description,
      salePrice: updated.sale_price,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    })
  } catch (e) {
    console.error("PATCH pack:", e)
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; packId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { id: storeId, packId } = await params
    const denied = await assertPackDelete(user, storeId)
    if (denied) return denied

    const del = await prisma.storePack.deleteMany({
      where: { id: packId, storeId },
    })
    if (del.count === 0) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE pack:", e)
    const code = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : ""
    if (code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Suppression impossible : des données liées empêchent encore la suppression (ex. factures, transferts).",
        },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 })
  }
}
