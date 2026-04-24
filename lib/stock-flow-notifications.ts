import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/**
 * Notifications « stock » (réappro, retours) : uniquement **in-app** (base de données).
 * Aucune config VAPID ni abonnement push : les gestionnaires voient les alertes
 * dans la cloche du tableau de bord (PC ou mobile navigateur).
 */

async function getWarehouseStaffUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { status: "ACTIVE", managedWarehouses: { some: {} } },
    select: { id: true },
  })
  return users.map((u) => u.id)
}

async function getStoreStaffUserIds(storeId: string): Promise<string[]> {
  const [byManaged, byRole] = await Promise.all([
    prisma.user.findMany({
      where: { status: "ACTIVE", managedStores: { some: { id: storeId } } },
      select: { id: true },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", storeUserRoles: { some: { storeId } } },
      select: { id: true },
    }),
  ])
  return [...new Set([...byManaged, ...byRole].map((u) => u.id))]
}

async function createInAppForUsers(
  userIds: string[],
  row: {
    title: string
    body: string
    kind?: string | null
    payload?: Prisma.InputJsonValue
  }
) {
  const unique = [...new Set(userIds)]
  if (unique.length === 0) return
  await prisma.staffInAppNotification.createMany({
    data: unique.map((userId) => ({
      userId,
      title: row.title,
      body: row.body,
      kind: row.kind ?? null,
      payload: row.payload ?? undefined,
    })),
  })
}

/** Entrepôt + équipe du magasin concerné. */
export async function notifyStoreAndWarehouse(
  storeId: string,
  opts: { title: string; body: string; data?: Record<string, unknown> }
): Promise<void> {
  const wh = await getWarehouseStaffUserIds()
  const st = await getStoreStaffUserIds(storeId)
  const ids = [...new Set([...wh, ...st])]
  const kind =
    typeof opts.data?.type === "string" ? opts.data.type : "STOCK_FLOW"
  await createInAppForUsers(ids, {
    title: opts.title,
    body: opts.body,
    kind,
    payload: opts.data as Prisma.InputJsonValue,
  })
}

/** Uniquement gestionnaires entrepôt. */
export async function notifyWarehouseStaff(opts: {
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<void> {
  const ids = await getWarehouseStaffUserIds()
  const kind =
    typeof opts.data?.type === "string" ? opts.data.type : "STOCK_FLOW"
  await createInAppForUsers(ids, {
    title: opts.title,
    body: opts.body,
    kind,
    payload: opts.data as Prisma.InputJsonValue,
  })
}
