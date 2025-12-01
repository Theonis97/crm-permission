import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { releaseDeliveryPersonStock } from '@/lib/delivery-stock-validator';

/**
 * POST /api/delivery/orders/[orderId]/cancel
 * Annuler une commande (CONFIRMED ou DELIVERING -> CANCELLED)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { reason } = body; // Raison de l'annulation (optionnel)

    // Vérifier que la commande existe
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        deliveryPerson: true,
        items: {
          select: {
            productId: true,
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    // Vérifier que la commande peut être annulée
    if (!['CONFIRMED', 'DELIVERING', 'PENDING'].includes(order.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cette commande ne peut pas être annulée (statut: ${order.status})` 
        },
        { status: 400 }
      );
    }

    // Transaction pour annuler la commande et libérer le stock réservé
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la commande
      const updated = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          cancelReason: reason || 'Annulée par le livreur',
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
        },
      });

      // 2. Si la commande avait un livreur assigné et des items, libérer le stock réservé
      if (order.deliveryPersonId && order.items.length > 0) {
        console.log(`🔄 Libération du stock réservé du livreur ${order.deliveryPersonId} pour la commande ${order.number}`);
        
        const stockItems = order.items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        }));

        // Libérer le stock réservé du livreur
        await releaseDeliveryPersonStock(order.deliveryPersonId, stockItems);
        
        console.log(`✅ Stock libéré avec succès pour ${stockItems.length} produit(s)`);
      }

      return updated;
    });

    console.log(`❌ Commande ${order.number} annulée par ${updatedOrder.deliveryPerson?.name || 'livreur inconnu'}. Raison: ${reason || 'Non spécifiée'}`);

    return NextResponse.json({
      success: true,
      message: 'Commande annulée',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        cancelReason: updatedOrder.cancelReason,
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
      },
    });
  } catch (error) {
    console.error('❌ Cancel order error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'annulation de la commande' },
      { status: 500 }
    );
  }
}
