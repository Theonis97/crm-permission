"use server"

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeDeliveryPersonStock, validateDeliveryPersonStock } from '@/lib/delivery-stock-validator';
import { Prisma } from '@prisma/client';
import { requireApiKey } from '@/lib/api-key-auth';

/**
 * POST /api/delivery/orders/[orderId]/ext-deliver
 * Marquer une commande comme livrée depuis un service externe
 * Authentification via x-api-key header
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
  // Vérifier la clé API
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    const { orderId } = await params;
    console.log('[EXT] orderId reçu =', orderId);

    const url = new URL(request.url);
    const queryDriverEmail = url.searchParams.get('driverEmail');

    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {}

    // Priorité : query param > body, puis trim
    const rawDriverEmail = queryDriverEmail ?? body.driverEmail;
    const driverEmail: string | null = rawDriverEmail
      ? String(rawDriverEmail).trim()
      : null;

    console.log('[EXT] driverEmail reçu =', driverEmail);

    // Validation des paramètres requis
    if (!driverEmail) {
      return NextResponse.json(
        { success: false, error: "Email du livreur requis" },
        { status: 400 }
      );
    }

    // Récupérer le livreur par email (recherche insensible à la casse)
    const driver = await prisma.deliveryPerson.findFirst({
      where: {
        email: {
          equals: driverEmail,
          mode: 'insensitive',
        },
      },
    });

    console.log('[EXT] driver trouvé =', driver);

    if (!driver) {
      return NextResponse.json(
        { success: false, error: "Livreur introuvable pour cet email" },
        { status: 404 }
      );
    }

    // Vérifier que la commande existe (modèle Order: approvisionnement)
    // On accepte que orderId soit soit l'id interne (Order.id), soit le number lisible (Order.number)
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { number: orderId },
        ],
      },
      include: {
        items: true,
      },
    });

    console.log('[EXT] order trouvé =', order && { id: order.id, number: order.number });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande introuvable' },
        { status: 404 }
      );
    }

    // (Optionnel) on peut garder une contrainte de statut si tu veux
    // Ici je la commente pour suivre ton flow exact où seule l'existence de la commande est obligatoire
    // if (order.status !== 'DELIVERING') {
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: `Cette commande doit être en cours de livraison (statut actuel: ${order.status})`,
    //     },
    //     { status: 400 }
    //   );
    // }

    // 4 - Vérifier que le livreur a le stock demandé pour cette commande
    // OrderItem utilise requestedQuantity comme quantité demandée
    const stockItems = order.items.map((item) => ({
      productId: item.productId,
      variantId: null,
      quantity: item.requestedQuantity,
    }));

    const stockValidation = await validateDeliveryPersonStock(driver.id, stockItems);

    if (!stockValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stock insuffisant pour livrer cette commande',
          details: stockValidation.insufficientItems,
        },
        { status: 400 },
      );
    }

    // 5 & 6 - Marquer la commande comme DELIVERED et déstocker le livreur
    const updatedOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 5 - Marquer la commande comme DELIVERED
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // 6 - Consommer le stock du livreur et créer les mouvements de vente
      await consumeDeliveryPersonStock(driver.id, order.id, stockItems, order.requestedBy, tx);

      return updated;
    });

    console.log(`✅ [EXT] Commande ${order.number} livrée par le livreur (email: ${driverEmail})`);

    return NextResponse.json({
      success: true,
      message: 'Commande marquée comme livrée (service externe)',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        deliveredAt: updatedOrder.deliveredAt,
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
