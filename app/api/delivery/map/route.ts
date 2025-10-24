import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/delivery/map
 * Récupère toutes les données pour la carte globale de livraison :
 * - Commandes en attente (PENDING, CONFIRMED, PREPARING)
 * - Zones de livraison avec polygones
 * - Positions des livreurs actifs
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const zoneFilter = searchParams.get('zoneId'); // Filtre optionnel par zone
    const dateFilter = searchParams.get('date'); // Filtre optionnel par date

    // 1. Récupérer les commandes en attente avec coordonnées
    const ordersWhere: any = {
      status: {
        in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
      },
      deliveryAddress: { not: null },
    };

    // Filtrer par zone si spécifié
    if (zoneFilter && zoneFilter !== 'all') {
      ordersWhere.deliveryZoneId = zoneFilter;
    }

    // Filtrer par date si spécifié (commandes du jour uniquement)
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      const startOfDay = new Date(filterDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(filterDate);
      endOfDay.setHours(23, 59, 59, 999);

      ordersWhere.createdAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const orders = await prisma.storeOrder.findMany({
      where: ordersWhere,
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Formatter les commandes pour la carte
    const formattedOrders = orders
      .filter(order => order.deliveryLatitude && order.deliveryLongitude)
      .map(order => ({
        id: order.id,
        number: order.number,
        status: order.status,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        coordinates: {
          lat: order.deliveryLatitude!,
          lng: order.deliveryLongitude!,
        },
        total: order.total,
        priority: order.priority,
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

    // 2. Récupérer toutes les zones de livraison avec polygones
    const zonesWhere: any = {
      isActive: true,
    };

    if (zoneFilter && zoneFilter !== 'all') {
      zonesWhere.id = zoneFilter;
    }

    const zones = await prisma.deliveryZone.findMany({
      where: zonesWhere,
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

    // 3. Récupérer les livreurs actifs avec leurs positions
    // Note: Pour l'instant, on utilise le centre de leur zone
    // Dans une version future, vous pourriez ajouter un système de tracking GPS en temps réel
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
        const zone = driver.deliveryZones[0]; // Prendre la première zone
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

    // Statistiques
    const stats = {
      totalOrders: formattedOrders.length,
      pendingOrders: formattedOrders.filter(o => o.status === 'PENDING').length,
      confirmedOrders: formattedOrders.filter(o => o.status === 'CONFIRMED').length,
      preparingOrders: formattedOrders.filter(o => o.status === 'PREPARING').length,
      readyOrders: formattedOrders.filter(o => o.status === 'READY').length,
      deliveringOrders: formattedOrders.filter(o => o.status === 'DELIVERING').length,
      totalZones: formattedZones.length,
      activeDrivers: formattedDrivers.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        zones: formattedZones,
        drivers: formattedDrivers,
        stats,
      },
    });
  } catch (error) {
    console.error('❌ Get delivery map data error:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des données' },
      { status: 500 }
    );
  }
}
