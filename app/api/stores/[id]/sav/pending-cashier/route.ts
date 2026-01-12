import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Liste des retours SAV en attente de validation par la caisse
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Récupérer les retours en attente de validation caisse
    const pendingReturns = await prisma.productReturn.findMany({
      where: {
        storeId,
        status: "AWAITING_CASHIER",
        sentToCashier: true,
        cashierValidated: false,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              }
            },
            exchangeProduct: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        sentToCashierBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { sentToCashierAt: "desc" }
    })

    // Calculer les statistiques
    const stats = {
      total: pendingReturns.length,
      exchanges: pendingReturns.filter(r => r.resolutionType === "EXCHANGE").length,
      refunds: pendingReturns.filter(r => r.resolutionType === "REFUND").length,
      totalToCollect: pendingReturns
        .filter(r => r.resolutionType === "EXCHANGE")
        .reduce((sum, r) => sum + (r.totalCustomerAddition || 0), 0),
      totalToRefund: pendingReturns
        .filter(r => r.resolutionType === "REFUND")
        .reduce((sum, r) => sum + (r.totalRefundAmount || 0), 0),
    }

    return NextResponse.json({
      returns: pendingReturns,
      stats
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des retours en attente:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
