import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Mettre à jour la commande
    const updatedOrder = await prisma.storeOrder.update({
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
