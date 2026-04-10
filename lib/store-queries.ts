import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { isPrismaMissingStoreLegalColumns } from "@/lib/store-legal"

const managerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  name: true,
} as const

/** Champs Store sans les colonnes juridiques (compat. base non migrée). */
export const storeSelectBase: Prisma.StoreSelect = {
  id: true,
  name: true,
  logo: true,
  coverImage: true,
  address: true,
  phone: true,
  email: true,
  whatsapp: true,
  isActive: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
  manager: { select: managerSelect },
}

export const storeSelectWithLegal: Prisma.StoreSelect = {
  ...storeSelectBase,
  formeJuridique: true,
  rccm: true,
  nif: true,
  cnssEmployeur: true,
  cnssPatronale: true,
  siegeSocial: true,
  dateCreation: true,
}

export async function findManyStoresOrdered() {
  try {
    return await prisma.store.findMany({
      select: storeSelectWithLegal,
      orderBy: { createdAt: "desc" },
    })
  } catch (e) {
    if (isPrismaMissingStoreLegalColumns(e)) {
      console.warn(
        "[stores] Colonnes juridiques absentes — liste sans RCCM/NIF/CNSS. Exécutez : npx prisma db push"
      )
      return prisma.store.findMany({
        select: storeSelectBase,
        orderBy: { createdAt: "desc" },
      })
    }
    throw e
  }
}

export async function findUniqueStoreByIdForApi(id: string) {
  try {
    return await prisma.store.findUnique({
      where: { id },
      select: storeSelectWithLegal,
    })
  } catch (e) {
    if (isPrismaMissingStoreLegalColumns(e)) {
      return prisma.store.findUnique({
        where: { id },
        select: storeSelectBase,
      })
    }
    throw e
  }
}

const STORE_LEGAL_UPDATE_KEYS = new Set([
  "formeJuridique",
  "rccm",
  "nif",
  "cnssEmployeur",
  "cnssPatronale",
  "siegeSocial",
  "dateCreation",
])

/**
 * Met à jour un magasin en évitant de lire des colonnes juridiques absentes en base
 * (`include` / défaut Prisma charge tous les scalaires → 500 si colonnes manquantes).
 */
export async function updateStoreByIdForApi(
  id: string,
  data: Prisma.StoreUpdateInput
): Promise<{
  store: Prisma.StoreGetPayload<{ select: typeof storeSelectWithLegal }>
  legalFieldsSkipped: boolean
}> {
  const payloadKeys = Object.keys(data as Record<string, unknown>)
  const hadLegalInPayload = payloadKeys.some((k) => STORE_LEGAL_UPDATE_KEYS.has(k))

  try {
    const store = await prisma.store.update({
      where: { id },
      data,
      select: storeSelectWithLegal,
    })
    return { store, legalFieldsSkipped: false }
  } catch (e) {
    if (!isPrismaMissingStoreLegalColumns(e)) throw e

    const strippedEntries = Object.entries(data as Record<string, unknown>).filter(
      ([k]) => !STORE_LEGAL_UPDATE_KEYS.has(k)
    )
    const stripped = Object.fromEntries(strippedEntries) as Prisma.StoreUpdateInput

    if (Object.keys(stripped).length === 0) {
      const err = new Error(
        "Colonnes juridiques absentes en base et aucun autre champ à mettre à jour."
      )
      Object.assign(err, { cause: e })
      throw err
    }

    const store = await prisma.store.update({
      where: { id },
      data: stripped,
      select: storeSelectBase,
    })
    return { store, legalFieldsSkipped: hadLegalInPayload }
  }
}
