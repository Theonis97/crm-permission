import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';
import { geocodeAddressWithCache, isPointInPolygon } from '@/lib/geocoding';

/**
 * PATCH /api/mobile/orders/[id]/status
 * Change le statut d'une commande
 * 
 * Règles de transition:
 * - PENDING -> READY ou DELIVERING (si aucune commande READY/DELIVERING en cours)
 * - READY -> DELIVERED ou CANCELLED
 * - DELIVERING -> DELIVERED ou CANCELLED
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authentifier l'utilisateur
    const { user, error } = await authenticateMobileUser(request);

    if (error || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: error || 'Non authentifié' 
        },
        { status: 401 }
      );
    }

    const { id: orderId } = await params;
    const body = await request.json();
    const { newStatus, cancelReason, amountReceived } = body;

    // Valider le nouveau statut
    const validStatuses = ['READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Statut invalide',
        },
        { status: 400 }
      );
    }

    // Récupérer la commande
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        deliveryZone: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Commande introuvable',
        },
        { status: 404 }
      );
    }

    // Vérifier que la commande est dans la zone du livreur ou lui est assignée
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: {
        deliveryPersonId: user.id,
        isActive: true,
      },
    });

    const isAssignedToDriver = order.deliveryPersonId === user.id;
    
    // Vérifier si la commande est dans la zone du livreur
    let isInDriverZone = deliveryZone && order.deliveryZoneId === deliveryZone.id;
    
    // Si pas de deliveryZoneId, vérifier géographiquement
    if (!isInDriverZone && deliveryZone && deliveryZone.coordinates && order.deliveryAddress) {
      const zonePolygon = deliveryZone.coordinates as Array<{ lat: number; lng: number }>;
      
      if (Array.isArray(zonePolygon) && zonePolygon.length >= 3) {
        let coordinates: { lat: number; lng: number } | null = null;

        // Utiliser les coordonnées déjà stockées si disponibles
        if (order.deliveryLatitude && order.deliveryLongitude) {
          coordinates = {
            lat: order.deliveryLatitude,
            lng: order.deliveryLongitude,
          };
          console.log(`📍 Commande ${order.number}: utilise coordonnées stockées`);
        } else {
          // Sinon, géocoder l'adresse
          console.log(`🌍 Géocodage de: ${order.deliveryAddress}`);
          const geocodingResult = await geocodeAddressWithCache(order.deliveryAddress);
          
          if (geocodingResult.success && geocodingResult.coordinates) {
            coordinates = geocodingResult.coordinates;
            
            // Mettre à jour les coordonnées dans la commande
            await prisma.storeOrder.update({
              where: { id: order.id },
              data: {
                deliveryLatitude: coordinates.lat,
                deliveryLongitude: coordinates.lng,
              },
            });
            console.log(`✅ Géocodage réussi: ${coordinates.lat}, ${coordinates.lng}`);
          } else {
            console.log(`❌ Géocodage échoué: ${geocodingResult.error}`);
          }
        }

        // Vérifier si les coordonnées sont dans le polygone
        if (coordinates) {
          isInDriverZone = isPointInPolygon(coordinates, zonePolygon);
          if (isInDriverZone) {
            console.log(`✅ Commande ${order.number} géographiquement dans zone ${deliveryZone.name}`);
          } else {
            console.log(`❌ Commande ${order.number} géographiquement hors zone ${deliveryZone.name}`);
          }
        }
      }
    }
    
    // Le livreur peut agir sur la commande si :
    // 1. La commande lui est déjà assignée
    // 2. La commande est dans sa zone ET non assignée (pour pouvoir la prendre)
    const canActOnOrder = isAssignedToDriver || (isInDriverZone && !order.deliveryPersonId);

    if (!canActOnOrder) {
      console.log(`❌ Commande ${order.number} refusée pour livreur ${user.name}`);
      console.log(`   - isAssignedToDriver: ${isAssignedToDriver}`);
      console.log(`   - isInDriverZone: ${isInDriverZone}`);
      console.log(`   - order.deliveryPersonId: ${order.deliveryPersonId}`);
      console.log(`   - order.deliveryZoneId: ${order.deliveryZoneId}`);
      console.log(`   - order.deliveryAddress: ${order.deliveryAddress}`);
      console.log(`   - deliveryZone: ${deliveryZone?.name || 'N/A'}`);
      
      return NextResponse.json(
        {
          success: false,
          error: order.deliveryPersonId 
            ? 'Cette commande est assignée à un autre livreur'
            : 'Cette commande ne vous est pas assignée',
        },
        { status: 403 }
      );
    }

    // Règle: Un livreur ne peut avoir qu'une commande READY ou DELIVERING à la fois
    if (newStatus === 'READY' || newStatus === 'DELIVERING') {
      // Vérifier si le livreur n'a pas déjà une commande READY ou DELIVERING
      const activeOrdersCount = await prisma.storeOrder.count({
        where: {
          deliveryPersonId: user.id,
          status: {
            in: ['READY', 'DELIVERING'],
          },
          id: {
            not: orderId, // Exclure la commande actuelle
          },
        },
      });

      if (activeOrdersCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Vous avez déjà une commande en cours (Prête ou En livraison). Terminez-la avant d\'en prendre une nouvelle.',
          },
          { status: 400 }
        );
      }
    }

    // Valider les transitions de statut
    const currentStatus = order.status;

    // Règles de transition
    const allowedTransitions: Record<string, string[]> = {
      'PENDING': ['READY', 'DELIVERING'],
      'CONFIRMED': ['READY', 'DELIVERING'],
      'PREPARING': ['READY', 'DELIVERING'],
      'READY': ['DELIVERING', 'DELIVERED', 'CANCELLED'],
      'DELIVERING': ['DELIVERED', 'CANCELLED'],
    };

    const allowed = allowedTransitions[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Transition impossible de ${currentStatus} vers ${newStatus}`,
        },
        { status: 400 }
      );
    }

    // Validation spécifique pour CANCELLED
    if (newStatus === 'CANCELLED' && !cancelReason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Le motif d\'annulation est obligatoire',
        },
        { status: 400 }
      );
    }

    // Validation spécifique pour DELIVERED
    if (newStatus === 'DELIVERED') {
      // Si paiement à la livraison, demander le montant reçu
      if (order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID') {
        if (amountReceived === undefined || amountReceived === null) {
          return NextResponse.json(
            {
              success: false,
              error: 'Le montant reçu est obligatoire pour les paiements à la livraison',
            },
            { status: 400 }
          );
        }

        // Vérifier que le montant est correct
        if (amountReceived < order.total) {
          return NextResponse.json(
            {
              success: false,
              error: `Le montant reçu (${amountReceived} FCFA) est inférieur au total de la commande (${order.total} FCFA)`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    // Assigner le livreur à la commande si ce n'est pas déjà fait
    if ((newStatus === 'READY' || newStatus === 'DELIVERING') && !order.deliveryPersonId) {
      updateData.deliveryPersonId = user.id;
    }

    // Ajouter le motif d'annulation
    if (newStatus === 'CANCELLED' && cancelReason) {
      updateData.cancelReason = cancelReason;
    }

    // Marquer comme livré
    if (newStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
      
      // Si paiement à la livraison, marquer comme payé
      if (order.paymentMethod === 'CASH' && order.paymentStatus !== 'PAID') {
        updateData.paymentStatus = 'PAID';
        updateData.paidAt = new Date();
      }
    }

    // Mettre à jour la commande
    const updatedOrder = await prisma.storeOrder.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                photos: true,
              },
            },
          },
        },
        deliveryZone: true,
        deliveryPerson: true,
      },
    });

    console.log(`✅ Order status updated: ${order.number} - ${currentStatus} -> ${newStatus} by ${user.name}`);

    return NextResponse.json({
      success: true,
      data: {
        order: updatedOrder,
        message: `Commande ${order.number} mise à jour avec succès`,
      },
    });

  } catch (error) {
    console.error('❌ Update order status error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la mise à jour du statut' 
      },
      { status: 500 }
    );
  }
}
