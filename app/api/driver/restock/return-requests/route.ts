import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveDeliveryPersonByUserEmail } from "@/lib/driver-session"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"

async function resolveDeliveryPerson(userId: string, userEmail: string | null | undefined) {
  const byEmail = await getActiveDeliveryPersonByUserEmail(userEmail)
  return byEmail
}

/**
 * POST /api/driver/restock/return-requests
 * Le livreur crée une demande de retour en magasin (PENDING — en attente de validation).
 */
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
    const { deliveryPersonId: bodyDriverId, stockItemId, quantity, notes, storeId: bodyStoreId } = body as {
      deliveryPersonId?: string
      stockItemId: string
      quantity: number
      notes?: string
      storeId?: string
    }

    if (!stockItemId || !quantity || quantity <= 0) {
      return NextResponse.json({ error: "stockItemId et quantity sont requis" }, { status: 400 })
    }

    let deliveryPersonId: string

    if (reason === "staff") {
      if (!bodyDriverId) {
        return NextResponse.json({ error: "deliveryPersonId requis en mode staff" }, { status: 400 })
      }
      deliveryPersonId = bodyDriverId
    } else {
      const dp = await resolveDeliveryPerson(session.user.id, session.user.email)
      if (!dp) {
        return NextResponse.json({ error: "Profil livreur introuvable" }, { status: 404 })
      }
      deliveryPersonId = dp.id
    }

    // Charger le stock item du livreur
    const stockItem = await prisma.deliveryPersonStock.findUnique({
      where: { id: stockItemId },
      include: {
        product: { select: { id: true, name: true } },
        deliveryPerson: { select: { id: true, storeId: true } },
      },
    })

    if (!stockItem || stockItem.deliveryPersonId !== deliveryPersonId) {
      return NextResponse.json({ error: "Article de stock introuvable" }, { status: 404 })
    }

    const available = stockItem.quantity - (stockItem.reserved || 0)
    if (quantity > available) {
      return NextResponse.json(
        { error: `Quantité insuffisante : ${available} disponible(s), ${quantity} demandé(s)` },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas déjà une demande PENDING pour ce même article
    const existingPending = await prisma.driverReturnRequest.findFirst({
      where: { stockItemId, status: "PENDING" },
    })
    if (existingPending) {
      return NextResponse.json(
        { error: "Une demande de retour est déjà en attente pour cet article" },
        { status: 400 }
      )
    }

    // Utiliser le magasin choisi par le livreur, sinon son magasin d'attache
    const targetStoreId = bodyStoreId || stockItem.deliveryPerson.storeId

    // Vérifier que le magasin cible existe
    const targetStore = await prisma.store.findUnique({
      where: { id: targetStoreId, isActive: true },
      select: { id: true, name: true },
    })
    if (!targetStore) {
      return NextResponse.json({ error: "Magasin introuvable ou inactif" }, { status: 404 })
    }

    const returnRequest = await prisma.driverReturnRequest.create({
      data: {
        deliveryPersonId,
        storeId: targetStoreId,
        stockItemId,
        productId: stockItem.productId,
        variantId: stockItem.variantId ?? null,
        requestedQuantity: quantity,
        notes: notes ?? null,
        status: "PENDING",
      },
      include: {
        product: { select: { id: true, name: true } },
        store: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: `Demande de retour soumise — en attente de validation du gestionnaire`,
      returnRequest,
    })
  } catch (error) {
    console.error("[DRIVER_RETURN_REQUEST_POST]", error)
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
  }
}

/**
 * GET /api/driver/restock/return-requests
 * Liste les demandes de retour du livreur connecté.
 */
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
      const qp = req.nextUrl.searchParams.get("deliveryPersonId")
      if (!qp) {
        return NextResponse.json({ error: "deliveryPersonId requis" }, { status: 400 })
      }
      deliveryPersonId = qp
    } else {
      const dp = await resolveDeliveryPerson(session.user.id, session.user.email)
      if (!dp) {
        return NextResponse.json({ error: "Profil livreur introuvable" }, { status: 404 })
      }
      deliveryPersonId = dp.id
    }

    const status = req.nextUrl.searchParams.get("status")

    const returnRequests = await prisma.driverReturnRequest.findMany({
      where: {
        deliveryPersonId,
        ...(status && status !== "all" ? { status: status as any } : {}),
      },
      include: {
        product: { select: { id: true, name: true, sku: true, photos: true } },
        store: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: returnRequests })
  } catch (error) {
    console.error("[DRIVER_RETURN_REQUEST_GET]", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
