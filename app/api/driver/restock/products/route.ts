import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"
import { fetchDriverStorePackDtos } from "@/lib/driver-store-packs"

/** Produits du magasin sélectionné (catalogue boutique) pour composer la demande. */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const storeId = req.nextUrl.searchParams.get("storeId")
    if (!storeId) {
      return NextResponse.json({ error: "storeId requis" }, { status: 400 })
    }

    const store = await prisma.store.findFirst({
      where: { id: storeId, isActive: true },
      select: { id: true, name: true },
    })
    if (!store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    const rows = await prisma.storeProduct.findMany({
      where: { storeId, isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            photos: true,
            linkedStorePackId: true,
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    })

    const data = rows
      .filter((sp) => !sp.product.linkedStorePackId)
      .map((sp) => ({
        productId: sp.product.id,
        name: sp.product.name,
        sku: sp.product.sku,
        photo:
          Array.isArray(sp.product.photos) && sp.product.photos.length > 0
            ? sp.product.photos[0]
            : null,
        stockMagasin: sp.stock,
        minStock: sp.minStock,
      }))

    const packs = await fetchDriverStorePackDtos(storeId)

    return NextResponse.json({ success: true, store, data, packs })
  } catch (e) {
    console.error("[driver/restock/products]", e)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
