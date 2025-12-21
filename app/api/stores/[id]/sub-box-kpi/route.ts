import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { startOfDay, endOfDay, subDays, format } from "date-fns"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params
    const { searchParams } = new URL(request.url)
    
    // Période par défaut : 30 derniers jours
    const days = parseInt(searchParams.get("days") || "30")
    const endDate = endOfDay(new Date())
    const startDate = startOfDay(subDays(new Date(), days))

    // 1. Récupérer toutes les sous-caisses du magasin
    const subBoxes = await prisma.subBox.findMany({
      where: { storeId },
      select: { id: true, name: true, code: true }
    })

    // 2. Récupérer toutes les commandes sur la période
    const orders = await prisma.subBoxOrder.findMany({
      where: {
        storeId,
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        // On prend toutes les commandes (PENDING, VALIDATED, CANCELLED) ou seulement les valides ?
        // Pour les bonus, généralement on veut les commandes validées, mais pour le suivi d'activité, tout est utile.
        // On va tout récupérer et faire le tri côté client ou dans la réponse.
      },
      select: {
        id: true,
        subBoxId: true,
        status: true,
        subtotal: true,
        totalDiscount: true,
        totalItems: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 3. Organiser les données
    
    // Structure pour le résumé global par sous-caisse
    const summaryBySubBox: Record<string, any> = {}
    subBoxes.forEach(sb => {
      summaryBySubBox[sb.id] = {
        id: sb.id,
        name: sb.name,
        code: sb.code,
        totalOrders: 0,
        validatedOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        totalItems: 0
      }
    })

    // Structure pour le détail par jour
    const dailyStats: Record<string, any> = {}

    orders.forEach(order => {
      const dayKey = format(order.createdAt, 'yyyy-MM-dd')
      
      // Init daily entry if not exists
      if (!dailyStats[dayKey]) {
        dailyStats[dayKey] = {
          date: dayKey,
          totalOrders: 0,
          totalRevenue: 0,
          subBoxes: {}
        }
        // Init subboxes for this day
        subBoxes.forEach(sb => {
          dailyStats[dayKey].subBoxes[sb.id] = {
            id: sb.id,
            name: sb.name,
            code: sb.code,
            count: 0,
            revenue: 0,
            items: 0
          }
        })
      }

      // Calculer le montant net après réduction
      const orderTotal = (order.subtotal || 0) - (order.totalDiscount || 0)

      // IMPORTANT: Pour les stats journalières et le graphique, on ne compte que les commandes VALIDÉES
      // C'est ce qui sert de base au calcul des bonus
      if (order.status === 'VALIDATED') {
        // Update Daily Stats (Global)
        dailyStats[dayKey].totalOrders++
        dailyStats[dayKey].totalRevenue += orderTotal

        // Update Daily SubBox Stats
        if (dailyStats[dayKey].subBoxes[order.subBoxId]) {
          dailyStats[dayKey].subBoxes[order.subBoxId].count++
          dailyStats[dayKey].subBoxes[order.subBoxId].items += (order.totalItems || 0)
          dailyStats[dayKey].subBoxes[order.subBoxId].revenue += orderTotal
        }
      }

      // Update Global Summary (keep tracking all statuses for overview)
      if (summaryBySubBox[order.subBoxId]) {
        summaryBySubBox[order.subBoxId].totalOrders++
        summaryBySubBox[order.subBoxId].totalItems += (order.totalItems || 0)
        
        if (order.status === 'VALIDATED') {
          summaryBySubBox[order.subBoxId].validatedOrders++
          summaryBySubBox[order.subBoxId].totalRevenue += orderTotal
        } else if (order.status === 'CANCELLED') {
          summaryBySubBox[order.subBoxId].cancelledOrders++
        }
      }
    })

    // Convertir dailyStats en array trié
    const history = Object.values(dailyStats).sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate,
          days
        },
        summary: Object.values(summaryBySubBox),
        history
      }
    })

  } catch (error) {
    console.error("[SUB_BOX_KPI_GET]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des KPI" },
      { status: 500 }
    )
  }
}
