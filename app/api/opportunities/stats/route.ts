import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { OpportunityStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canViewAll = await hasPermission(session.user.id, "opportunities.view_all")
    const canView = await hasPermission(session.user.id, "opportunities.view")

    if (!canView && !canViewAll) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const where: any = {}

    // Si l'utilisateur ne peut pas voir toutes les opportunités
    if (!canViewAll) {
      where.OR = [
        { ownerId: session.user.id },
        {
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ]
    }

    const [total, statusCounts] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.groupBy({
        by: ["status"],
        where,
        _count: {
          status: true,
        },
      }),
    ])

    const stats = {
      total,
      new: statusCounts.find((s) => s.status === OpportunityStatus.NEW)?._count.status || 0,
      inProgress: statusCounts.find((s) => s.status === OpportunityStatus.IN_PROGRESS)?._count.status || 0,
      won: statusCounts.find((s) => s.status === OpportunityStatus.WON)?._count.status || 0,
      lost: statusCounts.find((s) => s.status === OpportunityStatus.LOST)?._count.status || 0,
      totalValue: 0, // À implémenter si vous ajoutez un champ valeur
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des statistiques" }, { status: 500 })
  }
}
