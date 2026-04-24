import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/delivery/orders/[orderId]/modify
 * Modifier les items d'une commande (quantités, suppressions)
 * Utilisé par le livreur quand le client change d'avis sur place
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { items, newTotal, modifications, driverId } = body;

    console.log('🔧 [MODIFY_ORDER] Début modification commande:', {
      orderId,
      driverId,
      itemsCount: items?.length,
      newTotal,
      modificationsCount: modifications?.length
    });

    // Vérifier que la commande existe
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        deliveryPerson: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                prixVente: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                prixVente: true,
              },
            },
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

    // Vérifier que la commande peut être modifiée (seulement DELIVERING)
    if (order.status !== 'DELIVERING') {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cette commande ne peut pas être modifiée (statut: ${order.status}). Seules les commandes en cours de livraison peuvent être modifiées.` 
        },
        { status: 400 }
      );
    }

    // Vérifier que le livreur est bien celui assigné à la commande
    if (driverId && order.deliveryPersonId !== driverId) {
      return NextResponse.json(
        { success: false, error: 'Vous n\'êtes pas autorisé à modifier cette commande' },
        { status: 403 }
      );
    }

    // Vérifier qu'il reste au moins un item
    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'La commande doit contenir au moins un article' },
        { status: 400 }
      );
    }

    // Calculer l'ancien total pour comparaison
    const oldTotal = order.total;

    // Transaction pour mettre à jour la commande
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Supprimer les anciens items
      await tx.storeOrderItem.deleteMany({
        where: { storeOrderId: orderId },
      });

      // 2. Récupérer les infos des produits pour les nouveaux items
      const productIds = items.map((item: any) => item.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      });
      const productMap = new Map(products.map(p => [p.id, p]));

      // 3. Créer les nouveaux items avec les quantités modifiées
      const newItems = [];
      for (const item of items) {
        const product = productMap.get(item.productId);
        const createdItem = await tx.storeOrderItem.create({
          data: {
            storeOrderId: orderId,
            productId: item.productId,
            variantId: item.variantId || null,
            name: product?.name || item.productName || 'Produit',
            sku: product?.sku || item.sku || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice || item.price || 0,
            total: (item.unitPrice || item.price || 0) * item.quantity,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                prixVente: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                prixVente: true,
              },
            },
          },
        });
        newItems.push(createdItem);
      }

      // 4. Mettre à jour le total de la commande
      const updated = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          total: newTotal,
          updatedAt: new Date(),
          // Ajouter une note sur la modification
          notes: order.notes 
            ? `${order.notes}\n[Modifié le ${new Date().toLocaleString('fr-FR')}] Ancien total: ${oldTotal} FCFA`
            : `[Modifié le ${new Date().toLocaleString('fr-FR')}] Ancien total: ${oldTotal} FCFA`,
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
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  prixVente: true,
                },
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  prixVente: true,
                },
              },
            },
          },
        },
      });

      return updated;
    });

    // Log des modifications
    console.log(`✅ Commande ${order.number} modifiée avec succès:`, {
      oldTotal,
      newTotal,
      difference: newTotal - oldTotal,
      itemsCount: updatedOrder.items.length,
      modifications: modifications?.map((m: any) => ({
        product: m.productName,
        action: m.action,
        oldQty: m.originalQuantity,
        newQty: m.newQuantity,
      })),
    });

    return NextResponse.json({
      success: true,
      message: 'Commande modifiée avec succès',
      data: {
        id: updatedOrder.id,
        number: updatedOrder.number,
        status: updatedOrder.status,
        oldTotal,
        newTotal: updatedOrder.total,
        difference: updatedOrder.total - oldTotal,
        items: updatedOrder.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product?.name ?? "Produit",
          variantId: item.variantId,
          variantName: item.variant?.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
        deliveryPerson: updatedOrder.deliveryPerson,
        deliveryZone: updatedOrder.deliveryZone,
        modifications,
      },
    });
  } catch (error) {
    console.error('❌ Modify order error:', error);
    
    // Log détaillé de l'erreur
    if (error instanceof Error) {
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la modification de la commande',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
