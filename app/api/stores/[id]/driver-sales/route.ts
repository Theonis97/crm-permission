import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET — Ventes livreurs pour un magasin (admin/gestionnaire)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "orders.view")
    if (!canView) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const storeId = id
    void storeId // le storeId identifie le magasin appelant, mais on retourne toutes les ventes livreurs
    const { searchParams } = new URL(req.url)
    const driverIdFilter = searchParams.get("driverId")

    const where: Record<string, unknown> = {}
    if (driverIdFilter) where.deliveryPersonId = driverIdFilter

    const sales = await prisma.driverSale.findMany({
      where,
      orderBy: { declaredAt: "desc" },
      include: {
        deliveryPerson: {
          select: { id: true, name: true, email: true, avatar: true },
        },
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
          orderBy: { id: "asc" },
        },
      },
    })

    // Calcul du total par livreur + total global
    const byDriver: Record<string, {
      driverId: string
      driverName: string
      total: number
      netTotal: number
      totalDeliveryFees: number
      count: number
    }> = {}
    let grandTotal = 0
    let grandNetTotal = 0
    let grandDeliveryFees = 0

    for (const sale of sales) {
      const key = sale.deliveryPersonId
      if (!byDriver[key]) {
        byDriver[key] = { driverId: key, driverName: sale.deliveryPerson.name, total: 0, netTotal: 0, totalDeliveryFees: 0, count: 0 }
      }
      byDriver[key].total += sale.totalAmount
      byDriver[key].netTotal += sale.netTotalAmount
      byDriver[key].totalDeliveryFees += sale.totalDeliveryFees
      byDriver[key].count += 1
      grandTotal += sale.totalAmount
      grandNetTotal += sale.netTotalAmount
      grandDeliveryFees += sale.totalDeliveryFees
    }

    return NextResponse.json({
      sales,
      summary: {
        byDriver: Object.values(byDriver),
        grandTotal,
        grandNetTotal,
        grandDeliveryFees,
        totalSales: sales.length,
      },
    })
  } catch (err) {
    console.error("[GET /api/stores/[id]/driver-sales]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
