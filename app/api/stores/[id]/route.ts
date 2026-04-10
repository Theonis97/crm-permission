import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseStoreDateInput } from "@/lib/store-legal"
import { findUniqueStoreByIdForApi, updateStoreByIdForApi } from "@/lib/store-queries"
import type { Prisma } from "@prisma/client"

function prismaErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const c = (error as { code: unknown }).code
    return typeof c === "string" ? c : undefined
  }
  return undefined
}

// GET - Récupérer un magasin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    console.log("[STORE_GET] Fetching store with ID:", id)

    if (!session?.user) {
      console.log("[STORE_GET] No authenticated user")
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const store = await findUniqueStoreByIdForApi(id)

    if (!store) {
      console.log("[STORE_GET] Store not found for ID:", id)
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    console.log("[STORE_GET] Store found:", store.name)
    return NextResponse.json(store)
  } catch (error) {
    console.error("[STORE_GET] Error fetching store:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du magasin" }, { status: 500 })
  }
}

// PUT - Mettre à jour un magasin
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const {
      name,
      logo,
      coverImage,
      address,
      phone,
      email,
      whatsapp,
      isActive,
      managerId,
      formeJuridique,
      rccm,
      nif,
      cnssEmployeur,
      cnssPatronale,
      siegeSocial,
      dateCreation,
    } = body

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingStore) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Validation du nom seulement s'il est fourni
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json({ error: "Le nom du magasin est requis" }, { status: 400 })
    }

    // Préparer les données à mettre à jour (seulement les champs fournis)
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (logo !== undefined) updateData.logo = logo?.trim() || null
    if (coverImage !== undefined) updateData.coverImage = coverImage?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (managerId !== undefined) {
      const mid =
        managerId === "" || managerId === "none" ? null : managerId
      updateData.managerId = mid
    }
    if (formeJuridique !== undefined)
      updateData.formeJuridique = formeJuridique?.trim() || null
    if (rccm !== undefined) updateData.rccm = rccm?.trim() || null
    if (nif !== undefined) updateData.nif = nif?.trim() || null
    if (cnssEmployeur !== undefined)
      updateData.cnssEmployeur = cnssEmployeur?.trim() || null
    if (cnssPatronale !== undefined)
      updateData.cnssPatronale = cnssPatronale?.trim() || null
    if (siegeSocial !== undefined)
      updateData.siegeSocial = siegeSocial?.trim() || null
    if (dateCreation !== undefined) {
      const d = parseStoreDateInput(dateCreation)
      if (d !== undefined) updateData.dateCreation = d
    }

    const data = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    ) as typeof updateData

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Aucune donnée à mettre à jour" },
        { status: 400 }
      )
    }

    if (data.managerId != null && typeof data.managerId === "string") {
      const userExists = await prisma.user.findUnique({
        where: { id: data.managerId },
        select: { id: true },
      })
      if (!userExists) {
        return NextResponse.json(
          { error: "Le manager sélectionné n'existe pas (identifiant invalide)." },
          { status: 400 }
        )
      }
    }

    const { store: updatedStore, legalFieldsSkipped } = await updateStoreByIdForApi(
      id,
      data as Prisma.StoreUpdateInput
    )

    if (legalFieldsSkipped) {
      console.warn(
        "[STORE_PUT] Colonnes juridiques absentes en base — RCCM/NIF/CNSS non enregistrés. Exécutez prisma db push."
      )
      return NextResponse.json({
        ...updatedStore,
        _warning:
          "Les champs juridiques (RCCM, NIF, CNSS…) n'ont pas été enregistrés : colonnes absentes en base. Lancez npx prisma db push ou migrate deploy.",
      })
    }

    // Synchroniser les données juridiques du magasin vers PayrollCompanySettings
    // pour qu'elles apparaissent automatiquement sur les bulletins de paie
    try {
      const hasLegalFields =
        rccm !== undefined ||
        nif !== undefined ||
        cnssEmployeur !== undefined ||
        name !== undefined ||
        address !== undefined ||
        phone !== undefined ||
        email !== undefined ||
        logo !== undefined

      if (hasLegalFields) {
        const syncData: Record<string, string | null> = {}

        if (name !== undefined && name?.trim())       syncData.companyName    = name.trim()
        if (address !== undefined)                     syncData.companyAddress = address?.trim() || null
        if (phone !== undefined)                       syncData.companyPhone   = phone?.trim() || null
        if (email !== undefined)                       syncData.companyEmail   = email?.trim() || null
        if (logo !== undefined)                        syncData.companyLogo    = logo?.trim() || null
        if (rccm !== undefined)                        syncData.rccmNumber     = rccm?.trim() || null
        if (nif !== undefined)                         syncData.nifNumber      = nif?.trim() || null
        if (cnssEmployeur !== undefined)               syncData.cnssEmployerNumber = cnssEmployeur?.trim() || null

        if (Object.keys(syncData).length > 0) {
          const existingSettings = await prisma.payrollCompanySettings.findFirst()

          if (existingSettings) {
            await prisma.payrollCompanySettings.update({
              where: { id: existingSettings.id },
              data: {
                ...syncData,
                updatedById: session.user?.id ?? undefined,
              },
            })
          } else if (syncData.companyName && syncData.companyAddress) {
            // Créer les paramètres s'ils n'existent pas encore et qu'on a les champs obligatoires
            await prisma.payrollCompanySettings.create({
              data: {
                companyName:        syncData.companyName ?? "",
                companyAddress:     syncData.companyAddress ?? "",
                companyCity:        "",
                companyCountry:     "Gabon",
                companyPhone:       syncData.companyPhone ?? null,
                companyEmail:       syncData.companyEmail ?? null,
                companyLogo:        syncData.companyLogo ?? null,
                rccmNumber:         syncData.rccmNumber ?? null,
                nifNumber:          syncData.nifNumber ?? null,
                cnssEmployerNumber: syncData.cnssEmployerNumber ?? null,
                updatedById:        session.user?.id ?? undefined,
              },
            })
          }
        }
      }
    } catch (syncError) {
      // La synchronisation est non-bloquante : on log l'erreur sans faire échouer la réponse
      console.warn("[STORE_PUT] Sync PayrollCompanySettings échoué (non bloquant):", syncError)
    }

    return NextResponse.json(updatedStore)
  } catch (error) {
    console.error("Error updating store:", error)
    const code = prismaErrorCode(error)
    if (code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Référence invalide (ex. manager inexistant). Vérifiez le manager ou laissez le champ vide.",
        },
        { status: 400 }
      )
    }
    if (code === "P2022") {
      return NextResponse.json(
        {
          error:
            "Colonnes manquantes en base (infos juridiques). Exécutez : npx prisma migrate deploy ou npx prisma db push",
        },
        { status: 500 }
      )
    }
    const prismaMsg =
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof (error as { message: string }).message === "string"
        ? (error as { message: string }).message
        : ""
    const hint =
      prismaMsg.includes("forme_juridique") ||
      prismaMsg.includes("cnss_employeur") ||
      prismaMsg.includes("does not exist") ||
      prismaMsg.includes("Unknown column") ||
      prismaMsg.includes("Unknown arg")
        ? " Vérifiez que Prisma est à jour (npx prisma generate) et que la base contient les colonnes (migrate deploy / db push)."
        : ""
    return NextResponse.json(
      {
        error: `Erreur lors de la mise à jour du magasin.${hint ? ` ${hint}` : ""}`,
        details: process.env.NODE_ENV === "development" ? prismaMsg : undefined,
      },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un magasin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
      select: { id: true },
    })

    if (!existingStore) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Supprimer le magasin
    await prisma.store.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Magasin supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting store:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du magasin" }, { status: 500 })
  }
}
