import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Récupérer l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // Pour filtrer par utilisateur
    const storeId = searchParams.get('storeId') // Pour filtrer par magasin
    const startDate = searchParams.get('startDate') // Date de début
    const endDate = searchParams.get('endDate') // Date de fin
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Construire les conditions de filtrage
    const where: any = {}

    // Si un userId spécifique est demandé, l'utiliser, sinon utiliser l'utilisateur connecté
    if (userId) {
      where.userId = userId
    } else {
      where.userId = user.id
    }

    if (storeId) {
      where.storeId = storeId
    }

    if (startDate || endDate) {
      where.closeDate = {}
      if (startDate) {
        where.closeDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.closeDate.lte = new Date(endDate)
      }
    }

    // Calculer l'offset pour la pagination
    const offset = (page - 1) * limit

    // Récupérer les clôtures avec pagination
    const [dayCloses, totalCount] = await Promise.all([
      prisma.dayClose.findMany({
        where,
        include: {
          store: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          closeDate: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.dayClose.count({ where })
    ])

    // Calculer les statistiques globales pour la période
    const stats = await prisma.dayClose.aggregate({
      where,
      _sum: {
        totalSales: true,
        totalItems: true,
        totalRevenue: true,
        totalTax: true,
        totalDiscounts: true
      },
      _avg: {
        totalRevenue: true
      }
    })

    const response = {
      dayCloses: dayCloses.map(dayClose => ({
        id: dayClose.id,
        closeDate: dayClose.closeDate,
        store: dayClose.store,
        user: dayClose.user,
        totalSales: dayClose.totalSales,
        totalItems: dayClose.totalItems,
        subtotal: dayClose.subtotal,
        totalTax: dayClose.totalTax,
        totalDiscounts: dayClose.totalDiscounts,
        totalRevenue: dayClose.totalRevenue,
        notes: dayClose.notes,
        createdAt: dayClose.createdAt
      })),
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      },
      stats: {
        totalDays: totalCount,
        totalSales: stats._sum.totalSales || 0,
        totalItems: stats._sum.totalItems || 0,
        totalRevenue: stats._sum.totalRevenue || 0,
        totalTax: stats._sum.totalTax || 0,
        totalDiscounts: stats._sum.totalDiscounts || 0,
        averageRevenue: stats._avg.totalRevenue || 0
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[DAY_CLOSES_GET]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des clôtures" },
      { status: 500 }
    )
  }
}
