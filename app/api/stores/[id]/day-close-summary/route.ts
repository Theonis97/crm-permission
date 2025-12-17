import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Récupérer l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true }
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 })
    }

    // Obtenir la date d'aujourd'hui (début et fin de journée)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Vérifier si la journée est déjà clôturée
    const existingDayClose = await prisma.dayClose.findUnique({
      where: {
        storeId_closeDate: {
          storeId: storeId,
          closeDate: todayDateOnly
        }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    // Récupérer les commandes du jour créées par l'utilisateur connecté (hors annulées)
    const orders = await prisma.storeOrder.findMany({
      where: {
        storeId,
        createdById: user.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          not: "CANCELLED"
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Transformer les commandes en format de ventes
    const sales = orders.map(order => ({
      id: order.id,
      number: order.number,
      createdAt: order.createdAt,
      customerName: order.customerName || 'Client anonyme',
      items: order.items.map(item => ({
        productName: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        total: item.total
      })),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: order.subtotal,
      tax: order.totalTax,
      discount: order.totalDiscount,
      total: order.total
    }))

    // Calculer les totaux à partir des commandes
    const totalSales = orders.length
    const totalItems = orders.reduce((sum, order) => {
      return sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
    }, 0)
    const subtotal = orders.reduce((sum, order) => sum + order.subtotal, 0)
    const totalTax = orders.reduce((sum, order) => sum + order.totalTax, 0)
    const totalDiscounts = orders.reduce((sum, order) => sum + order.totalDiscount, 0)
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0)

    const summary = {
      storeName: store.name,
      date: today.toISOString().split('T')[0],
      totalSales,
      totalItems,
      subtotal,
      totalTax,
      totalDiscounts,
      totalRevenue,
      sales: sales.map(sale => ({
        id: sale.id,
        number: sale.number,
        createdAt: sale.createdAt,
        customerName: sale.customerName,
        itemCount: sale.itemCount,
        discount: sale.discount,
        total: sale.total
      })),
      isAlreadyClosed: !!existingDayClose,
      closedBy: existingDayClose?.user?.name || null,
      closedAt: existingDayClose?.createdAt || null
    }

    // Si la journée n'est pas encore clôturée, l'enregistrer
    if (!existingDayClose && totalSales > 0) {
      try {
        await prisma.dayClose.create({
          data: {
            storeId: storeId,
            userId: user.id,
            closeDate: todayDateOnly,
            totalSales,
            totalItems,
            subtotal,
            totalTax,
            totalDiscounts,
            totalRevenue,
            notes: `Clôture automatique - ${totalSales} vente${totalSales > 1 ? 's' : ''} effectuée${totalSales > 1 ? 's' : ''}`
          }
        })
        
        console.log(`✅ Journée clôturée pour le magasin ${store.name} par ${user.name}`)
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la clôture:', error)
        // On continue même si l'enregistrement échoue
      }
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("[DAY_CLOSE_SUMMARY_GET]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du résumé" },
      { status: 500 }
    )
  }
}

