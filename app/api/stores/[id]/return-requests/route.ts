import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notifyWarehouseStaff } from "@/lib/stock-flow-notifications"

function generateReturnNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const random = Math.floor(Math.random() * 9000) + 1000
  return `RET-${year}${month}-${random}`
}

/**
 * POST /api/stores/[id]/return-requests
 * Créer une demande de retour produit(s) vers l'entrepôt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { reason, notes, items } = body as {
      reason?: string
      notes?: string
      items: Array<{ productId: string; requestedQuantity: number; notes?: string }>
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Au moins un produit est requis" }, { status: 400 })
    }

    for (const item of items) {
      if (!item.productId || !item.requestedQuantity || item.requestedQuantity <= 0) {
        return NextResponse.json(
          { error: "Chaque produit doit avoir un productId et une quantité valide" },
          { status: 400 }
        )
      }
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({ where: { id: storeId } })
    if (!store) {
      return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 })
    }

    // Vérifier que les produits existent dans le stock du magasin
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        productId: { in: items.map((i) => i.productId) },
      },
      include: { product: { select: { id: true, name: true } } },
    })

    for (const item of items) {
      const sp = storeProducts.find((p) => p.productId === item.productId)
      if (!sp) {
        return NextResponse.json(
          { error: `Produit introuvable dans ce magasin` },
          { status: 400 }
        )
      }
      if (sp.stock < item.requestedQuantity) {
        return NextResponse.json(
          {
            error: `Stock insuffisant pour "${sp.product.name}" : ${sp.stock} disponible(s), ${item.requestedQuantity} demandé(s)`,
          },
          { status: 400 }
        )
      }
    }

    // Générer un numéro unique
    let number = generateReturnNumber()
    let attempts = 0
    while (attempts < 5) {
      const existing = await prisma.storeReturnRequest.findUnique({ where: { number } })
      if (!existing) break
      number = generateReturnNumber()
      attempts++
    }

    // Créer la demande de retour
    const returnRequest = await prisma.storeReturnRequest.create({
      data: {
        number,
        storeId,
        status: "PENDING",
        reason: reason || null,
        notes: notes || null,
        requestedById: session.user.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
            notes: item.notes || null,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        store: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    void notifyWarehouseStaff({
      title: "Retour magasin → entrepôt",
      body: `${returnRequest.store.name} · ${returnRequest.number} · ${items.length} ligne(s)`,
      data: {
        type: "STORE_RETURN_WAREHOUSE",
        id: returnRequest.id,
        storeId,
        number: returnRequest.number,
      },
    }).catch((err) => console.error("[notify STORE_RETURN_WAREHOUSE]", err))

    return NextResponse.json({
      success: true,
      message: `Demande de retour ${returnRequest.number} créée avec succès`,
      returnRequest,
    })
  } catch (error) {
    console.error("[STORE_RETURN_REQUEST_POST]", error)
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 })
  }
}

/**
 * GET /api/stores/[id]/return-requests
 * Lister les demandes de retour d'un magasin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const { searchParams } = request.nextUrl
    const status = searchParams.get("status")

    const returnRequests = await prisma.storeReturnRequest.findMany({
      where: {
        storeId,
        ...(status && status !== "all" ? { status: status as any } : {}),
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, photos: true } },
          },
        },
        requestedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        validatedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: returnRequests })
  } catch (error) {
    console.error("[STORE_RETURN_REQUEST_GET]", error)
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 })
  }
}
