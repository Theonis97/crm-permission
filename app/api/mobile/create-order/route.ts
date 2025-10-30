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
    const { items, customer, deliveryAddress, notes, status } = body;

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
            // Vérifier si les coordonnées sont dans la zone
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

    // Créer la commande
    const order = await prisma.storeOrder.create({
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
        status: status || 'PENDING',
        subtotal,
        total,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        deliveryPersonId: user.id, // Auto-assigner le livreur
        createdById: user.id, // Créé par le livreur
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
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

    console.log('✅ Commande créée:', order.id);

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        number: order.number,
        status: order.status,
        total: order.total,
      },
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

