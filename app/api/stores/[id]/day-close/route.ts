import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Enregistrer la clôture de journée
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier s'il y a déjà une clôture pour aujourd'hui
    const today = new Date()
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const existingClose = await prisma.dayClose.findFirst({
      where: {
        storeId,
        closeDate: todayDate,
      },
    })

    if (existingClose) {
      return NextResponse.json(
        { error: "La journée a déjà été clôturée" },
        { status: 400 }
      )
    }

    // Calculer les statistiques de la journée
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    
    const sales = await prisma.stockMovement.findMany({
      where: {
        type: "SALE",
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        product: {
          storeProducts: {
            some: {
              storeId,
            },
          },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            prixVente: true,
          },
        },
      },
    })

    // Calculer les totaux
    const totalSales = sales.length
    const totalItems = Math.abs(sales.reduce((sum, sale) => sum + sale.quantity, 0))
    const subtotal = sales.reduce((sum, sale) => {
      return sum + (Math.abs(sale.quantity) * (sale.product?.prixVente || 0))
    }, 0)
    const totalTax = 0 // À calculer selon les règles de TVA
    const totalDiscounts = 0 // À calculer selon les remises
    const totalRevenue = subtotal - totalDiscounts + totalTax

    // Créer l'enregistrement de clôture
    const dayClose = await prisma.dayClose.create({
      data: {
        storeId,
        userId: user.id,
        closeDate: todayDate,
        totalSales,
        totalItems,
        subtotal,
        totalTax,
        totalDiscounts,
        totalRevenue,
        notes: `Clôture automatique - ${totalSales} ventes, ${totalItems} articles, ${totalRevenue} FCFA`,
      },
    })

    return NextResponse.json({
      success: true,
      dayClose,
      summary: {
        totalSales,
        totalItems,
        subtotal,
        totalTax,
        totalDiscounts,
        totalRevenue,
        closeDate: dayClose.closeDate,
        closedBy: user.name || user.email,
      },
    })
  } catch (error: any) {
    console.error("[DAY_CLOSE_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la clôture de la journée" },
      { status: 500 }
    )
  }
}
