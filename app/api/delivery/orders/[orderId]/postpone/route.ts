import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/delivery/orders/[orderId]/postpone
 * Reporter une commande (CONFIRMED ou DELIVERING -> PENDING) avec nouvelle date
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { driverId, zoneId, newDate, note } = body;

    console.log('📅 Postpone order request:', { orderId, driverId, zoneId, newDate, note });

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

    // Vérifier que la commande peut être reportée
    if (!['CONFIRMED', 'DELIVERING', 'PENDING'].includes(order.status)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cette commande ne peut pas être reportée (statut: ${order.status})` 
        },
        { status: 400 }
      );
    }

    // Vérifier que le livreur est bien assigné à cette commande
    if (driverId && order.deliveryPersonId !== driverId) {
      console.warn(`⚠️ Livreur ${driverId} tente de reporter la commande ${order.number} assignée à ${order.deliveryPersonId}`);
    }

    // Parser la nouvelle date
    let requestedDeliveryDate: Date | null = null;
    if (newDate) {
      try {
        requestedDeliveryDate = new Date(newDate);
        // Vérifier que la date est valide
        if (isNaN(requestedDeliveryDate.getTime())) {
          return NextResponse.json(
            { success: false, error: 'Format de date invalide' },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Format de date invalide' },
          { status: 400 }
        );
      }
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.storeOrder.update({
      where: { id: orderId },
      data: {
        status: 'PENDING', // Remettre en PENDING pour reprogrammation
        requestedDeliveryDate: requestedDeliveryDate,
        notes: note || `Livraison reportée au ${newDate || 'date ultérieure'}`,
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

    console.log(`📅 Commande ${order.number} reportée au ${newDate || 'date ultérieure'} par ${updatedOrder.deliveryPerson?.name || 'livreur inconnu'}`);

    return NextResponse.json({
      success: true,
      message: 'Commande reportée avec succès',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        requestedDeliveryDate: updatedOrder.requestedDeliveryDate,
        notes: updatedOrder.notes,
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
      },
    });
  } catch (error) {
    console.error('❌ Postpone order error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors du report de la commande' },
      { status: 500 }
    );
  }
}
