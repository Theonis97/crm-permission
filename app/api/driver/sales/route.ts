import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"

// GET — Historique des ventes du livreur connecté
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed, reason } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const deliveryPersonIdParam = searchParams.get("deliveryPersonId")

    let deliveryPersonId: string

    if (reason === "staff" && deliveryPersonIdParam) {
      // Admin/gestionnaire consultant un livreur spécifique
      deliveryPersonId = deliveryPersonIdParam
    } else {
      // Livreur consultant ses propres ventes
      const dp = await prisma.deliveryPerson.findFirst({
        where: { email: session.user.email, isActive: true },
        select: { id: true },
      })
      if (!dp) {
        return NextResponse.json({ data: [], warning: "no_driver_profile" }, { status: 200 })
      }
      deliveryPersonId = dp.id
    }

    const sales = await prisma.driverSale.findMany({
      where: { deliveryPersonId },
      orderBy: { declaredAt: "desc" },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, photos: true, prixVente: true },
            },
            variant: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
      },
    })

    return NextResponse.json({ data: sales })
  } catch (err) {
    console.error("[GET /api/driver/sales]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST — Déclarer des ventes (livreur)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const body = await req.json()
    const { items, notes } = body as {
      items: Array<{
        productId: string
        variantId?: string | null
        quantity: number
        unitPrice: number
      }>
      notes?: string
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "La liste des articles est vide" }, { status: 400 })
    }

    // Récupérer le profil livreur
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: { email: session.user.email, isActive: true },
      select: { id: true, storeId: true },
    })
    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Aucun profil livreur actif trouvé pour ce compte" },
        { status: 422 },
      )
    }

    // Validation des quantités vs stock disponible
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) {
        return NextResponse.json(
          { error: `Article invalide : ${item.productId}` },
          { status: 400 },
        )
      }
      if (item.unitPrice < 0) {
        return NextResponse.json({ error: "Le prix ne peut pas être négatif" }, { status: 400 })
      }

      const stockLine = await prisma.deliveryPersonStock.findFirst({
        where: {
          deliveryPersonId: deliveryPerson.id,
          productId: item.productId,
          variantId: item.variantId ?? null,
        },
        select: { quantity: true },
      })

      const available = stockLine?.quantity ?? 0
      if (available < item.quantity) {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        })
        return NextResponse.json(
          {
            error: `Stock insuffisant pour "${product?.name ?? item.productId}" : ${available} disponible(s), ${item.quantity} demandé(s)`,
          },
          { status: 400 },
        )
      }
    }

    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0)

    // Transaction : créer la vente + décrémenter le stock
    const sale = await prisma.$transaction(async (tx) => {
      // Créer la vente
      const newSale = await tx.driverSale.create({
        data: {
          deliveryPersonId: deliveryPerson.id,
          storeId: deliveryPerson.storeId,
          totalAmount,
          notes: notes ?? null,
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              variantId: i.variantId ?? null,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
          },
        },
        include: {
          items: true,
          store: { select: { id: true, name: true } },
        },
      })

      // Décrémenter le stock du livreur pour chaque article
      for (const item of items) {
        await tx.deliveryPersonStock.updateMany({
          where: {
            deliveryPersonId: deliveryPerson.id,
            productId: item.productId,
            variantId: item.variantId ?? null,
          },
          data: { quantity: { decrement: item.quantity } },
        })
      }

      return newSale
    })

    return NextResponse.json({ data: sale, message: "Ventes déclarées avec succès" }, { status: 201 })
  } catch (err) {
    console.error("[POST /api/driver/sales]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
