"use server"
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeDeliveryPersonStock } from '@/lib/delivery-stock-validator';
import { Prisma } from '@prisma/client';

/**
 * POST /api/delivery/orders/[orderId]/ext-deliver
 * Marquer une commande comme livrée depuis un service externe
 * Body:
 * {
 *   orderId,
 *   driverEmail,
 *   amountReceived,
 *   paymentMethod?,
 *   notes?
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const {
      driverEmail,
      amountReceived,
      paymentMethod = 'CASH',
      notes,
    } = body;

    // Validation des paramètres requis
    if (!driverEmail) {
      return NextResponse.json(
        { success: false, error: "Email du livreur requis" },
        { status: 400 }
      );
    }

    if (!amountReceived || amountReceived <= 0) {
      return NextResponse.json(
        { success: false, error: 'Montant reçu requis et doit être positif' },
        { status: 400 }
      );
    }

    // Récupérer le livreur par email
    const driver = await prisma.deliveryPerson.findUnique({
      where: { email: driverEmail },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Livreur introuvable pour cet email" },
        { status: 404 }
      );
    }

    // Vérifier que la commande existe
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        deliveryPerson: true,
        items: {
          include: {
            product: true,
            variant: true,
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

    // Vérifier que la commande est en cours de livraison
    if (order.status !== 'DELIVERING') {
      return NextResponse.json(
        {
          success: false,
          error: `Cette commande doit être en cours de livraison (statut actuel: ${order.status})`,
        },
        { status: 400 }
      );
    }

    // Vérifier que la commande est bien assignée à ce livreur (via son id)
    if (order.deliveryPersonId !== driver.id) {
      return NextResponse.json(
        { success: false, error: "Cette commande n'est pas assignée à ce livreur" },
        { status: 403 }
      );
    }

    // Calculer la monnaie à rendre
    const changeGiven = Math.max(0, amountReceived - order.total);

    // Validation du montant reçu
    if (amountReceived < order.total) {
      return NextResponse.json(
        {
          success: false,
          error: `Montant insuffisant. Total: ${order.total} FCFA, Reçu: ${amountReceived} FCFA`,
        },
        { status: 400 },
      );
    }

    // Préparer les items pour la consommation du stock
    const stockItems = order.items.map((item: { productId: any; variantId: any; quantity: any }) => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    // Transaction pour mettre à jour la commande et consommer le stock
    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Mettre à jour la commande avec les nouveaux champs
      const updated = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          paymentStatus: 'PAID',
          paidAt: new Date(),
          amountReceived,
          changeGiven,
          paymentMethod,
          notes: notes || 'Livraison confirmée (service externe)',
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

      // 2. Consommer le stock du livreur et créer les mouvements de vente
      await consumeDeliveryPersonStock(driver.id, orderId, stockItems, order.createdById, tx);

      return updated;
    });

    console.log(`✅ [EXT] Commande ${order.number} livrée par ${updatedOrder.deliveryPerson?.name || 'livreur inconnu'} (email: ${driverEmail})`);
    console.log(`💰 Montant reçu: ${amountReceived} FCFA, Monnaie rendue: ${changeGiven} FCFA`);

    return NextResponse.json({
      success: true,
      message: 'Commande marquée comme livrée (service externe)',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        deliveredAt: updatedOrder.deliveredAt,
        amountReceived: updatedOrder.amountReceived,
        changeGiven: updatedOrder.changeGiven,
        paymentMethod: updatedOrder.paymentMethod,
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
      },
    });
  } catch (error) {
    console.error('❌ External deliver order error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la confirmation de livraison (service externe)' },
      { status: 500 },
    );
  }
}
