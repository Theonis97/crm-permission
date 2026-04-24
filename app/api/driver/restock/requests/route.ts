import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveDeliveryPersonByUserEmail } from "@/lib/driver-session"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"
import { notifyStoreAndWarehouse } from "@/lib/stock-flow-notifications"

type ItemBody = { productId: string; requestedQuantity: number; variantId?: string | null; notes?: string | null }

/** Résolution du profil livreur pour l'utilisateur connecté (email ou rôle livreur). */
async function resolveDeliveryPerson(userId: string, userEmail: string | null | undefined) {
  // 1. Chercher par email (cas standard)
  const byEmail = await getActiveDeliveryPersonByUserEmail(userEmail)
  if (byEmail) return byEmail

  // 2. Chercher par userId si le modèle le supporte (aucun champ pour l'instant)
  // → Retourner null, l'appelant affichera un message d'erreur approprié
  return null
}

/** Liste des demandes du livreur connecté (ou du livreur choisi en mode gestionnaire). */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed, reason } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let deliveryPersonId: string

    if (reason === "staff") {
      // Mode gestionnaire : deliveryPersonId obligatoire en query param
      const qp = req.nextUrl.searchParams.get("deliveryPersonId")
      if (!qp) {
        return NextResponse.json(
          { success: false, error: "Paramètre deliveryPersonId requis (mode gestionnaire)." },
          { status: 400 },
        )
      }
      const dp = await prisma.deliveryPerson.findFirst({
        where: { id: qp, isActive: true },
        select: { id: true },
      })
      if (!dp) {
        return NextResponse.json({ success: false, error: "Livreur invalide" }, { status: 400 })
      }
      deliveryPersonId = dp.id
    } else {
      // Livreur (par email ou par rôle)
      const driverSelf = await resolveDeliveryPerson(session.user.id, session.user.email)
      if (!driverSelf) {
        // Rôle livreur présent mais aucune fiche livreur liée à cet email
        return NextResponse.json({
          success: true,
          data: [],
          warning: "no_driver_profile",
          message: "Votre compte n'a pas encore de fiche livreur associée. Contactez un administrateur.",
        })
      }
      deliveryPersonId = driverSelf.id
    }

    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "50", 10) || 50))

    const requests = await prisma.restockingRequest.findMany({
      where: { deliveryPersonId },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, photos: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (e) {
    console.error("[driver/restock/requests GET]", e)
    return NextResponse.json({ success: false, error: "Erreur lors du chargement des demandes" }, { status: 500 })
  }
}

/** Création d'une demande de réapprovisionnement vers la boutique choisie. */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed, reason } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await req.json()
    const { storeId, notes, items, deliveryPersonId: bodyDeliveryPersonId } = body as {
      storeId?: string
      notes?: string | null
      items?: ItemBody[]
      deliveryPersonId?: string
    }

    let deliveryPersonId: string

    if (reason === "staff") {
      // Mode gestionnaire : le livreur est fourni dans le body
      if (!bodyDeliveryPersonId || typeof bodyDeliveryPersonId !== "string") {
        return NextResponse.json(
          { success: false, error: "Sélectionnez le livreur concerné (deliveryPersonId)." },
          { status: 400 },
        )
      }
      const dp = await prisma.deliveryPerson.findFirst({
        where: { id: bodyDeliveryPersonId, isActive: true },
        select: { id: true },
      })
      if (!dp) {
        return NextResponse.json({ success: false, error: "Livreur invalide" }, { status: 400 })
      }
      deliveryPersonId = dp.id
    } else {
      // Livreur (par email ou par rôle)
      const driverSelf = await resolveDeliveryPerson(session.user.id, session.user.email)
      if (!driverSelf) {
        return NextResponse.json(
          {
            success: false,
            error: "no_driver_profile",
            message:
              "Votre compte n'a pas encore de fiche livreur associée à votre email. " +
              "Demandez à un administrateur de créer votre fiche livreur avec l'email : " +
              session.user.email,
          },
          { status: 422 },
        )
      }
      deliveryPersonId = driverSelf.id
    }

    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Magasin et au moins un produit sont requis" },
        { status: 400 },
      )
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, isActive: true },
      select: { id: true, name: true },
    })
    if (!store) {
      return NextResponse.json({ success: false, error: "Magasin introuvable" }, { status: 404 })
    }

    const normalized: {
      productId: string
      variantId: string | null
      requestedQuantity: number
      notes: string | null
    }[] = []
    for (const raw of items) {
      const qty = Math.floor(Number(raw.requestedQuantity))
      if (!raw.productId || qty < 1) {
        return NextResponse.json({ success: false, error: "Quantités invalides" }, { status: 400 })
      }
      const sp = await prisma.storeProduct.findFirst({
        where: { storeId, productId: raw.productId, isActive: true },
        select: { id: true },
      })
      if (!sp) {
        return NextResponse.json(
          { success: false, error: "Produit non disponible dans ce magasin" },
          { status: 400 },
        )
      }
      normalized.push({
        productId: raw.productId,
        variantId: raw.variantId ?? null,
        requestedQuantity: qty,
        notes: raw.notes?.trim() || null,
      })
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.restockingRequest.create({
        data: {
          deliveryPersonId,
          storeId,
          notes: typeof notes === "string" ? notes.trim() || null : null,
          status: "PENDING",
        },
      })
      for (const it of normalized) {
        await tx.restockingRequestItem.create({
          data: {
            restockingRequestId: request.id,
            productId: it.productId,
            variantId: it.variantId,
            requestedQuantity: it.requestedQuantity,
            notes: it.notes,
          },
        })
      }
      return request.id
    })

    const dpRow = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
      select: { name: true },
    })
    const driverName = dpRow?.name?.trim() || "Livreur"
    const totalQty = normalized.reduce((s, it) => s + it.requestedQuantity, 0)
    void notifyStoreAndWarehouse(store.id, {
      title: "Réapprovisionnement (livreur)",
      body: `${driverName} — ${store.name} · ${normalized.length} réf. · ${totalQty} unité(s)`,
      data: { type: "DRIVER_RESTOCK", requestId: result, storeId: store.id },
    }).catch((err) => console.error("[notify DRIVER_RESTOCK]", err))

    return NextResponse.json({
      success: true,
      message: `Demande envoyée à ${store.name}`,
      data: { id: result },
    })
  } catch (e) {
    console.error("[driver/restock/requests POST]", e)
    return NextResponse.json({ success: false, error: "Erreur lors de la création" }, { status: 500 })
  }
}
