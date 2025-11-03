import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { geocodeAddressWithCache } from '@/lib/geocoding';

/**
 * GET /api/delivery/driver-map
 * API publique pour l'application mobile du livreur
 * Récupère toutes les données de la carte avec la zone assignée du livreur
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId'); // ID du livreur depuis l'app mobile

    // Pour le développement, on peut récupérer toutes les données
    // En production, vous devriez vérifier l'ID du livreur avec un token

    // 1. Récupérer les commandes pertinentes pour le livreur
    // Si driverId fourni : ses commandes (CONFIRMED, DELIVERING, DELIVERED, CANCELLED) + PENDING de sa zone
    // Si pas de driverId : toutes les commandes actives
    let orders;
    
    if (driverId) {
      // Récupérer la zone du livreur d'abord
      const driver = await prisma.deliveryPerson.findUnique({
        where: { id: driverId },
        include: {
          deliveryZones: {
            where: { isActive: true },
            select: { id: true },
          },
        },
      });

      const driverZoneId = driver?.deliveryZones[0]?.id;

      orders = await prisma.storeOrder.findMany({
        where: {
          OR: [
            // Ses propres commandes (tous statuts)
            {
              deliveryPersonId: driverId,
              status: { in: ['CONFIRMED', 'DELIVERING', 'DELIVERED', 'CANCELLED'] },
            },
            // Commandes PENDING dans sa zone (disponibles)
            {
              status: 'PENDING',
              deliveryAddress: { not: null },
            },
          ],
        },
        include: {
          deliveryZone: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          deliveryPerson: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    } else {
      // Mode développement : toutes les commandes actives
      orders = await prisma.storeOrder.findMany({
        where: {
          status: {
            in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
          },
          deliveryAddress: { not: null },
        },
        include: {
          deliveryZone: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          deliveryPerson: {
            select: {
              id: true,
              name: true,
            },
          },
          store: {
            select: {
              id: true,
              name: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      });
    }

    // Géocoder automatiquement les commandes sans coordonnées
    const geocodingPromises = orders.map(async (order) => {
      // Si la commande n'a pas de coordonnées, la géocoder
      if (!order.deliveryLatitude || !order.deliveryLongitude) {
        if (order.deliveryAddress) {
          console.log(`🔍 Géocodage de l'adresse: ${order.deliveryAddress}`);
          const geocodingResult = await geocodeAddressWithCache(order.deliveryAddress);
          
          if (geocodingResult.success && geocodingResult.coordinates) {
            console.log(`✅ Coordonnées trouvées: ${geocodingResult.coordinates.lat}, ${geocodingResult.coordinates.lng}`);
            
            // Mettre à jour la commande dans la DB avec les coordonnées
            await prisma.storeOrder.update({
              where: { id: order.id },
              data: {
                deliveryLatitude: geocodingResult.coordinates.lat,
                deliveryLongitude: geocodingResult.coordinates.lng,
              },
            });
            
            // Retourner la commande avec les nouvelles coordonnées
            return {
              ...order,
              deliveryLatitude: geocodingResult.coordinates.lat,
              deliveryLongitude: geocodingResult.coordinates.lng,
            };
          } else {
            console.warn(`⚠️ Impossible de géocoder: ${order.deliveryAddress}`);
          }
        }
      }
      return order;
    });

    // Attendre que toutes les opérations de géocodage soient terminées
    const ordersWithCoordinates = await Promise.all(geocodingPromises);

    const formattedOrders = ordersWithCoordinates
      .map(order => ({
      id: order.id,
      number: order.number,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      coordinates: order.deliveryLatitude && order.deliveryLongitude ? {
        lat: order.deliveryLatitude,
        lng: order.deliveryLongitude,
      } : null,
      total: order.total,
      priority: order.priority,
      requestedDeliveryDate: order.requestedDeliveryDate,
      notes: order.notes,
      items: order.items.map((item: any) => ({
        id: item.id,
        productName: item.product?.name || item.name || 'Produit inconnu',
        quantity: item.quantity,
        unitPrice: item.unitPrice || 0,
        total: item.total || (item.quantity * (item.unitPrice || 0)),
      })),
      deliveryZone: order.deliveryZone ? {
        id: order.deliveryZone.id,
        name: order.deliveryZone.name,
        color: order.deliveryZone.color,
      } : null,
      deliveryPerson: order.deliveryPerson ? {
        id: order.deliveryPerson.id,
        name: order.deliveryPerson.name,
      } : null,
      store: {
        id: order.store.id,
        name: order.store.name,
      },
      createdAt: order.createdAt,
    }));

    // 2. Récupérer toutes les zones actives avec polygones
    const zones = await prisma.deliveryZone.findMany({
      where: {
        isActive: true,
      },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            storeOrders: {
              where: {
                status: {
                  in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
                },
              },
            },
          },
        },
      },
    });

    const formattedZones = zones.map(zone => ({
      id: zone.id,
      name: zone.name,
      color: zone.color,
      coordinates: zone.coordinates as Array<{ lat: number; lng: number }>,
      center: zone.centerLatitude && zone.centerLongitude ? {
        lat: zone.centerLatitude,
        lng: zone.centerLongitude,
      } : null,
      deliveryFee: zone.deliveryFee,
      estimatedTime: zone.estimatedTime,
      deliveryPerson: zone.deliveryPerson ? {
        id: zone.deliveryPerson.id,
        name: zone.deliveryPerson.name,
        phone: zone.deliveryPerson.phone,
      } : null,
      store: {
        id: zone.store.id,
        name: zone.store.name,
      },
      activeOrders: zone._count.storeOrders,
    }));

    // 3. Récupérer tous les livreurs actifs avec leurs positions
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true,
      },
      include: {
        deliveryZones: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            color: true,
            centerLatitude: true,
            centerLongitude: true,
          },
        },
        storeOrders: {
          where: {
            status: {
              in: ['READY', 'DELIVERING'],
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

    const formattedDrivers = deliveryPersons
      .filter(driver => driver.deliveryZones.length > 0)
      .map(driver => {
        const zone = driver.deliveryZones[0];
        return {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          coordinates: zone.centerLatitude && zone.centerLongitude ? {
            lat: zone.centerLatitude,
            lng: zone.centerLongitude,
          } : null,
          zone: {
            id: zone.id,
            name: zone.name,
            color: zone.color,
          },
          activeOrders: driver.storeOrders.map(order => ({
            id: order.id,
            number: order.number,
            status: order.status,
          })),
        };
      })
      .filter(driver => driver.coordinates !== null);

    // Trouver la zone du livreur connecté
    let currentDriverZoneId = null;
    if (driverId) {
      const driver = await prisma.deliveryPerson.findUnique({
        where: { id: driverId },
        include: {
          deliveryZones: {
            where: { isActive: true },
            select: { id: true },
            take: 1,
          },
        },
      });
      currentDriverZoneId = driver?.deliveryZones[0]?.id || null;
    } else {
      // TEMPORAIRE: Pour le développement, utiliser la première zone avec un livreur
      // En production, vous devriez toujours avoir un driverId authentifié
      const zoneWithDriver = formattedZones.find(z => z.deliveryPerson !== null);
      if (zoneWithDriver) {
        currentDriverZoneId = zoneWithDriver.id;
        console.log(`⚠️ Mode développement: utilisation de la zone ${zoneWithDriver.name} (${currentDriverZoneId})`);
      }
    }

    // Trouver la commande active du livreur (CONFIRMED ou DELIVERING)
    // Un livreur ne peut avoir qu'UNE SEULE commande active à la fois
    const activeOrder = formattedOrders.find(
      order => 
        order.deliveryPerson?.id === driverId &&
        (order.status === 'CONFIRMED' || order.status === 'DELIVERING')
    ) || null;

    // Vérifier si le livreur peut accepter de nouvelles commandes
    const canAcceptNewOrders = !activeOrder;

    // Statistiques
    const stats = {
      totalOrders: formattedOrders.length,
      pendingOrders: formattedOrders.filter(o => o.status === 'PENDING').length,
      confirmedOrders: formattedOrders.filter(o => o.status === 'CONFIRMED').length,
      preparingOrders: formattedOrders.filter(o => o.status === 'PREPARING').length,
      readyOrders: formattedOrders.filter(o => o.status === 'READY').length,
      deliveringOrders: formattedOrders.filter(o => o.status === 'DELIVERING').length,
      deliveredOrders: formattedOrders.filter(o => o.status === 'DELIVERED').length,
      cancelledOrders: formattedOrders.filter(o => o.status === 'CANCELLED').length,
      totalZones: formattedZones.length,
      activeDrivers: formattedDrivers.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        zones: formattedZones,
        drivers: formattedDrivers,
        currentDriverZoneId,
        activeOrder, // La commande en cours du livreur
        canAcceptNewOrders, // false si le livreur a déjà une commande active
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Get driver map data error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
