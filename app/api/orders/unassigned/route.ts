import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/orders/unassigned
 * Récupère toutes les commandes sans zone de livraison assignée
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 Récupération des commandes sans zone...')
    
    // Récupérer les commandes sans coordonnées (donc sans zone assignée)
    const orders = await prisma.storeOrder.findMany({
      where: {
        OR: [
          { deliveryLatitude: null },
          { deliveryLongitude: null },
          { deliveryZoneId: null }
        ],
        // Exclure les commandes déjà livrées ou annulées
        status: {
          notIn: ['DELIVERED', 'CANCELLED']
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        },
        deliveryZone: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ ${orders.length} commandes sans zone trouvées`)

    // Formater les données pour l'interface
    const formattedOrders = orders.map(order => ({
      id: order.id,
      number: order.number,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryDate: order.requestedDeliveryDate,
      total: order.total,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product?.name || item.name || 'Produit inconnu',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      deliveryZone: order.deliveryZone,
      deliveryPerson: order.deliveryPerson,
      store: order.store
    }))

    return NextResponse.json({
      success: true,
      data: formattedOrders
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des commandes sans zone:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des commandes' 
      },
      { status: 500 }
    )
  }
}
