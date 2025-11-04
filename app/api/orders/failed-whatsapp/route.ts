import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/orders/failed-whatsapp
 * Récupère les commandes WhatsApp avec erreurs de produits
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    console.log(`📋 Récupération des commandes WhatsApp échouées (statut: ${status})...`)

    const failedOrders = await prisma.failedWhatsAppOrder.findMany({
      where: {
        status: status
      },
      include: {
        resolvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ ${failedOrders.length} commandes échouées trouvées`)

    return NextResponse.json({
      success: true,
      data: failedOrders,
      count: failedOrders.length
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des commandes échouées:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des commandes échouées' 
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/orders/failed-whatsapp/:id
 * Marquer une commande échouée comme résolue ou rejetée
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const failedOrderId = searchParams.get('id')

    if (!failedOrderId) {
      return NextResponse.json(
        { success: false, error: 'ID de commande manquant' },
        { status: 400 }
      )
    }

    const data = await request.json()
    const { status, resolvedBy, resolvedOrderId, resolutionNotes } = data

    console.log(`📝 Mise à jour de la commande échouée ${failedOrderId}...`)

    const updatedOrder = await prisma.failedWhatsAppOrder.update({
      where: { id: failedOrderId },
      data: {
        status: status,
        resolvedAt: status === 'RESOLVED' || status === 'REJECTED' ? new Date() : null,
        resolvedBy: resolvedBy || null,
        resolvedOrderId: resolvedOrderId || null,
        resolutionNotes: resolutionNotes || null
      }
    })

    console.log(`✅ Commande échouée mise à jour: ${updatedOrder.id}`)

    return NextResponse.json({
      success: true,
      data: updatedOrder
    })

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour de la commande échouée:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la mise à jour' 
      },
      { status: 500 }
    )
  }
}
