import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBusinessDateKeyFromInstant } from "@/lib/driver-declaration-window"
import { totalCommissionForDriverDeclarationItems, driverDepositAmountAfterCommission } from "@/lib/commission-calculator"

const MAX_SALES = 8000
const MAX_DAYS_IN_RESPONSE = 120

/**
 * Clôtures côté déclarations livreur : regroupe les `DriverSale` par jour métier
 * (même logique que les ventes / 23h59) : encaissé, net magasin (produit, qté × prix net),
 * commission livreur, et **montant à déposer** (net − commission).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: driverId } = await params

    const driver = await prisma.deliveryPerson.findUnique({
      where: { id: driverId },
      select: { id: true },
    })

    if (!driver) {
      return NextResponse.json({ error: "Livreur non trouvé" }, { status: 404 })
    }

    const sales = await prisma.driverSale.findMany({
      where: { deliveryPersonId: driverId },
      select: {
        declaredAt: true,
        totalAmount: true,
        netTotalAmount: true,
        totalDeliveryFees: true,
        items: { select: { totalPrice: true } },
      },
      orderBy: { declaredAt: "desc" },
      take: MAX_SALES,
    })

    type DayAgg = {
      businessDateKey: string
      declarationCount: number
      totalCollected: number
      /** Somme des `netTotalAmount` (part magasin sur le produit, règles livraison). */
      totalNetForStore: number
      /** Ce que le livreur doit déposer : net − commission par déclaration. */
      totalToDeposit: number
      totalDeliveryFees: number
      totalDriverCommission: number
      lastDeclaredAt: Date
    }

    const grouped = new Map<string, DayAgg>()

    for (const s of sales) {
      const key = getBusinessDateKeyFromInstant(s.declaredAt)
      let g = grouped.get(key)
      if (!g) {
        g = {
          businessDateKey: key,
          declarationCount: 0,
          totalCollected: 0,
          totalNetForStore: 0,
          totalToDeposit: 0,
          totalDeliveryFees: 0,
          totalDriverCommission: 0,
          lastDeclaredAt: s.declaredAt,
        }
        grouped.set(key, g)
      }
      const commission = totalCommissionForDriverDeclarationItems(s.items)
      g.declarationCount += 1
      g.totalCollected += s.totalAmount
      g.totalNetForStore += s.netTotalAmount
      g.totalToDeposit += driverDepositAmountAfterCommission(s.netTotalAmount, s.items)
      g.totalDeliveryFees += s.totalDeliveryFees
      g.totalDriverCommission += commission
      if (s.declaredAt.getTime() > g.lastDeclaredAt.getTime()) {
        g.lastDeclaredAt = s.declaredAt
      }
    }

    const closes = Array.from(grouped.values())
      .sort((a, b) => b.businessDateKey.localeCompare(a.businessDateKey))
      .slice(0, MAX_DAYS_IN_RESPONSE)

    const totalDeclarations = closes.reduce((sum, c) => sum + c.declarationCount, 0)
    const totalToDepositAll = closes.reduce((sum, c) => sum + c.totalToDeposit, 0)
    const totalNetForStoreAll = closes.reduce((sum, c) => sum + c.totalNetForStore, 0)
    const totalCollectedAll = closes.reduce((sum, c) => sum + c.totalCollected, 0)
    const totalDriverCommissionAll = closes.reduce((sum, c) => sum + c.totalDriverCommission, 0)

    return NextResponse.json({
      closes: closes.map((c) => ({
        id: `${driverId}-${c.businessDateKey}`,
        closeDate: c.businessDateKey,
        declarationCount: c.declarationCount,
        totalCollected: c.totalCollected,
        totalNetForStore: c.totalNetForStore,
        totalToDeposit: c.totalToDeposit,
        totalDeliveryFees: c.totalDeliveryFees,
        totalDriverCommission: c.totalDriverCommission,
        lastDeclaredAt: c.lastDeclaredAt.toISOString(),
      })),
      summary: {
        totalDays: closes.length,
        totalDeclarations,
        totalCollectedAll,
        totalNetForStoreAll,
        totalToDepositAll,
        totalDriverCommissionAll,
        lastCloseDate: closes[0]?.businessDateKey ?? null,
      },
    })
  } catch (error) {
    console.error("Error fetching driver declaration closes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des clôtures" },
      { status: 500 }
    )
  }
}
