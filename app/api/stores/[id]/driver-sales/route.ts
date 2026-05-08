import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import type { Prisma } from "@prisma/client"
import {
  calculateCommission,
  driverDepositAmountAfterCommission,
  totalCommissionForDriverDeclarationItems,
} from "@/lib/commission-calculator"

function enrichDriverSaleRow<
  T extends { netTotalAmount: number; items: Array<{ totalPrice: number }> },
>(sale: T) {
  const items = sale.items.map((it) => ({
    ...it,
    commission: calculateCommission(it.totalPrice),
  }))
  const totalCommission = totalCommissionForDriverDeclarationItems(sale.items)
  const amountToDeposit = driverDepositAmountAfterCommission(sale.netTotalAmount, sale.items)
  return { ...sale, items, totalCommission, amountToDeposit }
}

function parseDateBoundary(dateStr: string, endOfDay: boolean): Date {
  const d = new Date(dateStr + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"))
  return d
}

// GET — Ventes livreurs (filtre période, magasin, livreur) + stats + classement
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    const userId =
      session?.user?.id ||
      (session?.user?.email
        ? (await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }))?.id
        : undefined)
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const canView = await hasPermission(userId, "orders.view")
    if (!canView) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    const { id } = await params
    const routeStoreId = id
    const { searchParams } = new URL(req.url)
    const driverIdFilter = searchParams.get("driverId")
    const storeIdFilter = searchParams.get("storeId")
    const allStores = searchParams.get("allStores") === "1"
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")

    const where: Prisma.DriverSaleWhereInput = {}
    if (driverIdFilter) where.deliveryPersonId = driverIdFilter
    if (storeIdFilter) {
      where.storeId = storeIdFilter
    } else if (!allStores) {
      where.storeId = routeStoreId
    }

    if (fromStr || toStr) {
      where.declaredAt = {}
      if (fromStr) {
        where.declaredAt.gte = parseDateBoundary(fromStr, false)
      }
      if (toStr) {
        where.declaredAt.lte = parseDateBoundary(toStr, true)
      }
    }

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

    const enrichedSales = sales.map((s) => enrichDriverSaleRow(s))

    // Calcul du total par livreur + total global
    const byDriver: Record<string, {
      driverId: string
      driverName: string
      total: number
      netTotal: number
      depositTotal: number
      totalDeliveryFees: number
      commissionTotal: number
      count: number
    }> = {}
    let grandTotal = 0
    let grandNetTotal = 0
    let grandDeliveryFees = 0
    let grandCommission = 0
    let grandAmountToDeposit = 0

    for (const sale of enrichedSales) {
      const key = sale.deliveryPersonId
      if (!byDriver[key]) {
        byDriver[key] = {
          driverId: key,
          driverName: sale.deliveryPerson.name,
          total: 0,
          netTotal: 0,
          depositTotal: 0,
          totalDeliveryFees: 0,
          commissionTotal: 0,
          count: 0,
        }
      }
      byDriver[key].total += sale.totalAmount
      byDriver[key].netTotal += sale.netTotalAmount
      byDriver[key].depositTotal += sale.amountToDeposit
      byDriver[key].totalDeliveryFees += sale.totalDeliveryFees
      byDriver[key].commissionTotal += sale.totalCommission
      byDriver[key].count += 1
      grandTotal += sale.totalAmount
      grandNetTotal += sale.netTotalAmount
      grandDeliveryFees += sale.totalDeliveryFees
      grandCommission += sale.totalCommission
      grandAmountToDeposit += sale.amountToDeposit
    }

    const byDriverList = Object.values(byDriver)
    const rankingByNet = [...byDriverList].sort(
      (a, b) =>
        b.netTotal - a.netTotal ||
        b.total - a.total ||
        b.count - a.count
    )
    const rankingByDeclarations = [...byDriverList].sort(
      (a, b) => b.count - a.count || b.netTotal - a.netTotal
    )

    return NextResponse.json({
      sales: enrichedSales,
      summary: {
        byDriver: byDriverList,
        grandTotal,
        grandNetTotal,
        grandDeliveryFees,
        grandCommission,
        grandAmountToDeposit,
        totalSales: enrichedSales.length,
        topPerformer:
          rankingByNet.length > 0
            ? {
                ...rankingByNet[0],
                rank: 1,
              }
            : null,
        rankingByNet: rankingByNet.map((d, i) => ({ ...d, rank: i + 1 })),
        rankingByDeclarations: rankingByDeclarations.map((d, i) => ({
          ...d,
          rank: i + 1,
        })),
      },
      period:
        fromStr || toStr ? { from: fromStr || null, to: toStr || null } : null,
    })
  } catch (err) {
    console.error("[GET /api/stores/[id]/driver-sales]", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
