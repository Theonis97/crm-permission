import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

      // RÈGLE CRITIQUE : Un livreur ne peut avoir qu'UNE SEULE commande active
      if (driver.storeOrders.length > 0) {
        const activeOrder = driver.storeOrders[0];
        return NextResponse.json(
          { 
            success: false, 
            error: `Vous avez déjà une commande active (${activeOrder.number}). Terminez-la avant d'en accepter une nouvelle.`,
            activeOrder: {
              id: activeOrder.id,
              number: activeOrder.number,
              status: activeOrder.status,
            },
          },
          { status: 400 }
        );
      }
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.storeOrder.update({
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
      },
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
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'acceptation de la commande' },
      { status: 500 }
    );
  }
}
