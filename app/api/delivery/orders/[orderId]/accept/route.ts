import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { reserveDeliveryPersonStock } from '@/lib/delivery-stock-validator';

/**
 * POST /api/delivery/orders/[orderId]/accept
 * API pour qu'un livreur accepte une commande
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { driverId, zoneId } = body;

    console.log('🚀 [ACCEPT_ORDER] Début acceptation commande:', {
      orderId,
      driverId,
      zoneId
    });

    // Vérifier que la commande existe
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        deliveryPerson: true,
        deliveryZone: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    // Vérifier que la commande est en attente
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cette commande est déjà ${order.status.toLowerCase()}` 
        },
        { status: 400 }
      );
    }

    // Vérifier que le livreur existe et peut accepter une nouvelle commande
    if (driverId) {
      const driver = await prisma.deliveryPerson.findUnique({
        where: { id: driverId },
        include: {
          storeOrders: {
            where: {
              status: {
                in: ['CONFIRMED', 'DELIVERING'],
              },
            },
            select: {
              id: true,
              number: true,
              status: true,
            },
          },
        },
      });

      if (!driver) {
        return NextResponse.json(
          { success: false, error: 'Livreur introuvable' },
          { status: 404 }
        );
      }

      if (!driver.isActive) {
        return NextResponse.json(
          { success: false, error: 'Ce livreur n\'est pas actif' },
          { status: 400 }
        );
      }

      // RÈGLE MISE À JOUR : Un livreur peut avoir jusqu'à 20 commandes actives
      const MAX_ORDERS_PER_DRIVER = 20;
      if (driver.storeOrders.length >= MAX_ORDERS_PER_DRIVER) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Vous avez atteint le maximum de ${MAX_ORDERS_PER_DRIVER} commandes actives (${driver.storeOrders.length}). Livrez une commande avant d'en accepter une nouvelle.`,
            activeOrders: driver.storeOrders.map(order => ({
              id: order.id,
              number: order.number,
              status: order.status,
            })),
            maxOrdersReached: true,
          },
          { status: 400 }
        );
      }
    }

    // Transaction pour mettre à jour la commande et réserver le stock du livreur
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la commande
      const updated = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED', // Passer de PENDING à CONFIRMED
          deliveryPersonId: driverId || order.deliveryPersonId,
          deliveryZoneId: zoneId || order.deliveryZoneId,
          updatedAt: new Date(),
        },
        include: {
          deliveryPerson: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          deliveryZone: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            select: {
              productId: true,
              variantId: true,
              quantity: true,
            },
          },
        },
      });

      // 2. Si un livreur accepte la commande, réserver son stock
      if (driverId && updated.items.length > 0) {
        console.log(`🚚 Réservation du stock du livreur ${driverId} pour la commande ${order.number}`);
        
        const stockItems = updated.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        }));

        // Réserver le stock du livreur (sans utiliser tx car la fonction a sa propre transaction)
        await reserveDeliveryPersonStock(driverId, stockItems);
      }

      return updated;
    });
    

    console.log(`✅ Commande ${order.number} acceptée par ${updatedOrder.deliveryPerson?.name || 'livreur inconnu'}`);

    return NextResponse.json({
      success: true,
      message: 'Commande acceptée avec succès',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
      },
    });
  } catch (error) {
    console.error('❌ Accept order error:', error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de l\'acceptation de la commande',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
