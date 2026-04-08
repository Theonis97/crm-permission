import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** GET /api/debug/restock-requests — réservé au super admin en dev */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    // Toutes les demandes (les 50 dernières)
    const requests = await prisma.restockingRequest.findMany({
      include: {
        store: { select: { id: true, name: true } },
        deliveryPerson: { select: { id: true, name: true, email: true, storeId: true } },
        items: {
          select: {
            id: true,
            requestedQuantity: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    // Tous les magasins actifs
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    // Tous les livreurs actifs
    const drivers = await prisma.deliveryPerson.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        storeId: true,
        store: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      ok: true,
      stores,
      drivers,
      requests: requests.map((r) => ({
        id: r.id,
        status: r.status,
        createdAt: r.createdAt,
        storeId: r.storeId,
        storeName: r.store?.name,
        deliveryPersonId: r.deliveryPersonId,
        deliveryPersonName: r.deliveryPerson?.name,
        deliveryPersonEmail: r.deliveryPerson?.email,
        deliveryPersonHomeStoreId: r.deliveryPerson?.storeId,
        itemCount: r.items.length,
        items: r.items.map((i) => `${i.product.name} ×${i.requestedQuantity}`),
      })),
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
