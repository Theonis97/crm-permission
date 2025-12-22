import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendDayClosureEmail } from "@/lib/email-service"

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

    // Calculer les statistiques de la journée basées sur les commandes clients
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    
    // Récupérer les commandes du jour créées par l'utilisateur connecté (hors annulées)
    const orders = await prisma.storeOrder.findMany({
      where: {
        storeId,
        createdById: user.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        items: true,
      },
    })

    // Calculer les totaux à partir des commandes
    const totalSales = orders.length
    const totalItems = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    }, 0)
    const subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0)
    const totalTax = orders.reduce((sum, order) => sum + order.totalTax, 0)
    const totalDiscounts = orders.reduce((sum, order) => sum + order.totalDiscount, 0)
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

    let dayClose
    const isUpdate = !!existingClose

    if (existingClose) {
      // Mettre à jour la clôture existante
      dayClose = await prisma.dayClose.update({
        where: { id: existingClose.id },
        data: {
          userId: user.id,
          totalSales,
          totalItems,
          subtotal,
          totalTax,
          totalDiscounts,
          totalRevenue,
          notes: `Clôture mise à jour - ${totalSales} ventes, ${totalItems} articles, ${totalRevenue} FCFA`,
          updatedAt: new Date(),
        },
      })
    } else {
      // Créer une nouvelle clôture
      dayClose = await prisma.dayClose.create({
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
    }

    // Envoyer l'email de clôture de journée (en arrière-plan)
    sendDayClosureEmail(storeId, user.id).catch(err => {
      console.error('❌ Erreur envoi email de clôture (non bloquant):', err)
    })

    return NextResponse.json({
      success: true,
      isUpdate,
      dayClose,
      summary: {
        totalSales,
        totalItems,
        subtotal,
        totalTax,
        totalDiscounts,
        totalRevenue,
        closeDate: dayClose.closeDate,
        closedBy: user.firstName || user.email,
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
