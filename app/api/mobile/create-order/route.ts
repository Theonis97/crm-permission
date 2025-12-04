import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';
import { geocodeAddressWithCache } from '@/lib/geocoding';

// Fonction pour vérifier si un point est dans une zone
function checkPointInZone(lat: number, lon: number, polygon: any): boolean {
  if (!polygon || !polygon.coordinates || !Array.isArray(polygon.coordinates)) {
    return false;
  }

  const points = polygon.coordinates;
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lat, yi = points[i].lon;
    const xj = points[j].lat, yj = points[j].lon;

    const intersect = ((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * POST /api/mobile/create-order
 * Créer une commande depuis l'app mobile (par le livreur)
 * - La commande est directement en statut CONFIRMED (acceptée par le livreur)
 * - Le stock du livreur est automatiquement déstocké
 * - Le stock du magasin n'est PAS affecté
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { items, customer, deliveryAddress, notes } = body;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Au moins un produit est requis' 
        },
        { status: 400 }
      );
    }

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Le nom et le téléphone du client sont obligatoires' 
        },
        { status: 400 }
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        { 
          success: false,
          error: 'L\'adresse de livraison est obligatoire' 
        },
        { status: 400 }
      );
    }

    // Récupérer le livreur avec sa boutique
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: user.id },
      include: {
        store: true,
      },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Livreur non trouvé' 
        },
        { status: 404 }
      );
    }

    // Vérifier le stock du livreur pour chaque produit AVANT de créer la commande
    const stockErrors: string[] = [];
    for (const item of items) {
      const driverStock = await prisma.deliveryPersonStock.findFirst({
        where: {
          deliveryPersonId: user.id,
          productId: item.productId,
          variantId: item.variantId || null,
        },
      });

      const availableQty = driverStock ? (driverStock.quantity - driverStock.reserved) : 0;
      
      if (!driverStock || availableQty < item.quantity) {
        stockErrors.push(`Stock insuffisant pour "${item.productName}": ${availableQty} disponible(s), ${item.quantity} demandé(s)`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: stockErrors.join('. '),
          stockErrors,
        },
        { status: 400 }
      );
    }

    // Géocoder l'adresse pour obtenir les coordonnées GPS
    let latitude: number | null = null;
    let longitude: number | null = null;
    let deliveryZoneId: string | null = null;

    try {
      const geocodeResult = await geocodeAddressWithCache(deliveryAddress);
      if (geocodeResult.success && geocodeResult.coordinates) {
        latitude = geocodeResult.coordinates.lat;
        longitude = geocodeResult.coordinates.lng;

        // Trouver la zone de livraison correspondante
        const zones = await prisma.deliveryZone.findMany({
          where: {
            deliveryPersonId: user.id,
            isActive: true,
          },
        });

        // Chercher si l'adresse est dans une zone
        for (const zone of zones) {
          if (zone.coordinates && geocodeResult.coordinates) {
            const isInZone = checkPointInZone(geocodeResult.coordinates.lat, geocodeResult.coordinates.lng, zone.coordinates);
            if (isInZone) {
              deliveryZoneId = zone.id;
              break;
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur géocodage:', error);
      // On continue quand même sans coordonnées GPS
    }

    // Calculer les totaux
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    const total = subtotal;

    // Générer un numéro de commande
    const orderCount = await prisma.storeOrder.count({
      where: {
        storeId: deliveryPerson.storeId,
      },
    });
    const orderNumber = `${deliveryPerson.store.name.toUpperCase().substring(0, 3)}-${String(orderCount + 1).padStart(6, '0')}`;

    // Transaction atomique : créer la commande + déstocker le livreur + créer les mouvements
    const order = await prisma.$transaction(async (tx) => {
      // Trouver un utilisateur système ou créer avec un utilisateur par défaut
      // Pour l'instant, on va chercher le premier utilisateur admin du magasin
      const storeUser = await tx.user.findFirst({
        where: {
          storeUserRoles: {
            some: {
              storeId: deliveryPerson.storeId,
            },
          },
        },
      });

      if (!storeUser) {
        throw new Error('Aucun utilisateur trouvé pour ce magasin. Impossible de créer la commande.');
      }

      // 1. Créer la commande avec statut CONFIRMED (directement acceptée)
      const newOrder = await tx.storeOrder.create({
        data: {
          number: orderNumber,
          storeId: deliveryPerson.storeId,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email || null,
          deliveryAddress,
          deliveryLatitude: latitude || null,
          deliveryLongitude: longitude || null,
          deliveryZoneId: deliveryZoneId,
          notes: notes || null,
          status: 'CONFIRMED', // Directement confirmée car créée par le livreur
          subtotal,
          total,
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING',
          deliveryPersonId: user.id, // Auto-assigner le livreur
          createdById: storeUser.id, // Utilisateur du magasin
          orderSource: 'mobile_driver', // Indiquer que c'est créé par le livreur
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              name: item.productName,
              quantity: item.quantity,
              unitPrice: item.price,
              total: item.price * item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Déstocker le stock du livreur et créer les mouvements de stock
      for (const item of items) {
        // Mettre à jour le stock du livreur (décrémenter la quantité)
        await tx.deliveryPersonStock.updateMany({
          where: {
            deliveryPersonId: user.id,
            productId: item.productId,
            variantId: item.variantId || null,
          },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // Créer le mouvement de stock (type SALE = vente)
        await tx.deliveryStockMovement.create({
          data: {
            deliveryPersonId: user.id,
            productId: item.productId,
            variantId: item.variantId || null,
            type: 'SALE',
            quantity: -item.quantity, // Négatif car c'est une sortie
            storeOrderId: newOrder.id,
            notes: `Vente - Commande ${orderNumber} (créée par livreur)`,
            createdById: null, // Pas d'utilisateur système pour les mouvements créés par livreur
          },
        });
      }

      return newOrder;
    });

    console.log('✅ Commande créée et stock livreur déstocké:', {
      orderId: order.id,
      orderNumber: order.number,
      status: order.status,
      itemsCount: order.items.length,
      total: order.total,
      deliveryPersonId: user.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total,
      },
      message: 'Commande créée avec succès',
    });
  } catch (error: any) {
    console.error('❌ Erreur création commande:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la création de la commande' 
      },
      { status: 500 }
    );
  }
}

