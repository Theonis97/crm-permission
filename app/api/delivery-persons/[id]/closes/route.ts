import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateCommission } from "@/lib/commission-calculator"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: driverId } = await params

    // Vérifier que le livreur existe
    const driver = await prisma.deliveryPerson.findUnique({
      where: { id: driverId },
    })

    if (!driver) {
      return NextResponse.json({ error: "Livreur non trouvé" }, { status: 404 })
    }

    // Récupérer les commandes livrées du livreur
    const deliveredOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: driverId,
        status: "DELIVERED",
        deliveredAt: {
          not: null
        }
      },
      orderBy: {
        deliveredAt: 'desc'
      },
      take: 500 // Limiter pour la performance
    })

    // Grouper par date de livraison
    const groupedData = new Map()

    deliveredOrders.forEach(order => {
      if (!order.deliveredAt) return

      const deliveryDate = order.deliveredAt.toISOString().split('T')[0]
      const key = deliveryDate

      if (!groupedData.has(key)) {
        groupedData.set(key, {
          id: `${driverId}-${deliveryDate}`,
          closeDate: deliveryDate,
          status: "APPROVED", // Les commandes livrées sont considérées comme approuvées
          totalOrders: 0,
          totalRevenue: 0,
          totalCommission: 0,
          totalCash: 0,
          totalCard: 0,
          totalMobile: 0,
          notes: null,
          createdAt: order.deliveredAt,
          approvedAt: order.deliveredAt,
          approvedBy: null
        })
      }

      const group = groupedData.get(key)
      group.totalOrders += 1
      group.totalRevenue += order.total || 0
      
      // Calculer la commission selon les règles métier
      const commission = calculateCommission(order.total || 0)
      group.totalCommission += commission

      // Comptabiliser par mode de paiement
      const paymentMethod = order.paymentMethod?.toUpperCase() || 'CASH'
      if (paymentMethod === 'CASH' || paymentMethod === 'ESPECES') {
        group.totalCash += order.total || 0
      } else if (paymentMethod === 'CARD' || paymentMethod === 'CARTE') {
        group.totalCard += order.total || 0
      } else if (paymentMethod === 'MOBILE' || paymentMethod === 'MOBILE_MONEY') {
        group.totalMobile += order.total || 0
      }
    })

    // Convertir en array et trier par date décroissante
    const closes = Array.from(groupedData.values())
      .sort((a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime())
      .slice(0, 50) // Limiter aux 50 dernières clôtures

    // Calculer les statistiques
    const totalCommission = closes.reduce((sum, c) => sum + c.totalCommission, 0)
    const lastClose = closes[0]

    return NextResponse.json({
      closes: closes.map(close => ({
        id: close.id,
        closeDate: close.closeDate,
        status: close.status,
        totalOrders: close.totalOrders,
        totalRevenue: close.totalRevenue,
        totalCommission: close.totalCommission,
        totalCash: close.totalCash,
        totalCard: close.totalCard,
        totalMobile: close.totalMobile,
        notes: close.notes,
        createdAt: close.createdAt?.toISOString() || close.closeDate,
        approvedAt: close.approvedAt?.toISOString() || null,
        approvedBy: close.approvedBy,
      })),
      summary: {
        totalCloses: closes.length,
        pendingCloses: 0, // Pas de clôtures en attente dans ce système
        totalCommission,
        lastCloseDate: lastClose?.closeDate || null,
      },
    })
  } catch (error) {
    console.error("Error fetching driver closes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des clôtures" },
      { status: 500 }
    )
  }
}
