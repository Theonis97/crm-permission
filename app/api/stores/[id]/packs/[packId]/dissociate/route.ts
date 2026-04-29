import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission, hasStorePermission } from "@/lib/auth-helpers"
import { dissociatePackUnitsAtStore } from "@/lib/store-packs"

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

async function assertPackDissociate(
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
 * POST — Dissocier des unités pack : recrédite chaque composant (qté × n), débite proxy + assembled_stock.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; packId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })

    const { id: storeId, packId } = await params
    const denied = await assertPackDissociate(user, storeId)
    if (denied) return denied

    const body = await request.json().catch(() => ({}))
    const dissociateCount = Math.max(
      1,
      Math.floor(Number((body as { dissociateCount?: number }).dissociateCount) || 1),
    )
    const note =
      typeof (body as { note?: string }).note === "string"
        ? (body as { note?: string }).note!.trim() || null
        : null

    const packRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM store_packs WHERE id = ${packId} AND store_id = ${storeId} LIMIT 1
    `
    if (packRows.length === 0) {
      return NextResponse.json({ error: "Pack introuvable" }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await dissociatePackUnitsAtStore(tx, {
        storeId,
        packId,
        units: dissociateCount,
        userId: user.id,
        note,
      })
    })

    return NextResponse.json({
      ok: true,
      dissociateCount,
      message: `${dissociateCount} pack(s) dissocié(s) — composants recrédités au magasin.`,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur lors de la dissociation"
    if (
      msg.includes("insuffisant") ||
      msg.includes("invalide") ||
      msg.includes("introuvable") ||
      msg.includes("absent")
    ) {
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    console.error("POST /packs/[packId]/dissociate:", e)
    return NextResponse.json({ error: "Erreur lors de la dissociation" }, { status: 500 })
  }
}
