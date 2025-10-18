import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/delivery/orders/[orderId]/start
 * Commencer la livraison d'une commande (CONFIRMED -> DELIVERING)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

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

    // Vérifier que la commande est en statut CONFIRMED
    if (order.status !== 'CONFIRMED') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cette commande doit être confirmée pour commencer la livraison (statut actuel: ${order.status})` 
        },
        { status: 400 }
      );
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERING',
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

    console.log(`🚚 Livraison commencée pour ${order.number} par ${updatedOrder.deliveryPerson?.name || 'livreur inconnu'}`);

    return NextResponse.json({
      success: true,
      message: 'Livraison commencée',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
      },
    });
  } catch (error) {
    console.error('❌ Start delivery error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du démarrage de la livraison' },
      { status: 500 }
    );
  }
}
