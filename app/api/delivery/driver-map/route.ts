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
                  photos: true,
                  sku: true,
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
                  photos: true,
                  sku: true,
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

    console.log('orders', orders);

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
      items: order.items.map((item: any) => {
        // 🖼️ LOGS POUR DEBUG DES IMAGES
        console.log(`📦 Item ${item.id} - ${item.name}:`);
        console.log(`   - Product data:`, item.product ? 'EXISTS' : 'NULL');
        
        if (item.product) {
          console.log(`   - Product ID: ${item.product.id}`);
          console.log(`   - Product name: ${item.product.name}`);
          console.log(`   - Photos array:`, item.product.photos);
          console.log(`   - Photos length:`, item.product.photos?.length || 0);
          console.log(`   - First photo:`, item.product.photos?.[0] || 'NONE');
          console.log(`   - SKU:`, item.product.sku || 'NONE');
        }

        const formattedItem = {
          id: item.id,
          productId: item.productId,
          variantId: item.variantId || null,
          productName: item.product?.name || item.name || 'Produit inconnu',
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          price: item.unitPrice || 0,
          total: item.total || (item.quantity * (item.unitPrice || 0)),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            image: item.product.photos && item.product.photos.length > 0 ? item.product.photos[0] : null,
            sku: item.product.sku,
          } : null,
        };

        console.log(`   - Final image URL:`, formattedItem.product?.image || 'NULL');
        console.log(`   ---`);
        
        return formattedItem;
      }),
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

    // 📊 STATISTIQUES DES IMAGES
    const totalItems = formattedOrders.reduce((sum, order) => sum + order.items.length, 0);
    const itemsWithImages = formattedOrders.reduce((sum, order) => 
      sum + order.items.filter(item => item.product?.image).length, 0
    );
    
    console.log(`\n📊 RÉSUMÉ DES IMAGES:`);
    console.log(`   Total items: ${totalItems}`);
    console.log(`   Items avec images: ${itemsWithImages}`);
    console.log(`   Pourcentage: ${totalItems > 0 ? Math.round(itemsWithImages/totalItems*100) : 0}%`);
    console.log(`   ==================\n`);

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
        store: {
          select: {
            id: true,
            name: true,
          },
        },
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

    console.log('🔍 DEBUG - Livreurs récupérés:', {
      total: deliveryPersons.length,
      details: deliveryPersons.map(d => ({
        id: d.id,
        name: d.name,
        storeName: d.store.name,
        zonesCount: d.deliveryZones.length,
        zones: d.deliveryZones.map(z => ({
          id: z.id,
          name: z.name,
          hasCoordinates: !!(z.centerLatitude && z.centerLongitude),
        })),
      })),
    });

    const formattedDrivers = deliveryPersons.map(driver => {
      // Si le livreur a des zones, utiliser la première zone avec coordonnées
      let zone = driver.deliveryZones.find(z => z.centerLatitude && z.centerLongitude) || driver.deliveryZones[0];
      
      // Si aucune zone avec coordonnées, utiliser la première zone disponible
      if (!zone && driver.deliveryZones.length > 0) {
        zone = driver.deliveryZones[0];
      }

      // Déterminer les coordonnées : zone > position par défaut (null pour l'instant)
      let coordinates: { lat: number; lng: number } | null = null;
      
      if (zone && zone.centerLatitude && zone.centerLongitude) {
        coordinates = {
          lat: zone.centerLatitude,
          lng: zone.centerLongitude,
        };
      }

      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        coordinates,
        zone: zone ? {
          id: zone.id,
          name: zone.name,
          color: zone.color,
        } : null, // Permettre null si pas de zone
        store: {
          id: driver.store.id,
          name: driver.store.name,
        },
        activeOrders: driver.storeOrders.map(order => ({
          id: order.id,
          number: order.number,
          status: order.status,
        })),
      };
    });

    console.log('🔍 DEBUG - Livreurs formatés:', {
      total: formattedDrivers.length,
      withCoordinates: formattedDrivers.filter(d => d.coordinates !== null).length,
      withoutCoordinates: formattedDrivers.filter(d => d.coordinates === null).length,
      withZone: formattedDrivers.filter(d => d.zone !== null).length,
      withoutZone: formattedDrivers.filter(d => d.zone === null).length,
      details: formattedDrivers.map(d => ({
        id: d.id,
        name: d.name,
        hasCoordinates: d.coordinates !== null,
        hasZone: d.zone !== null,
        zoneName: d.zone?.name || 'Aucune zone',
      })),
    });

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

    // Trouver toutes les commandes actives du livreur (CONFIRMED ou DELIVERING)
    // Un livreur peut maintenant avoir jusqu'à 5 commandes actives
    const activeOrders = formattedOrders.filter(
      order => 
        order.deliveryPerson?.id === driverId &&
        (order.status === 'CONFIRMED' || order.status === 'DELIVERING')
    );

    // Commande active principale (pour compatibilité avec l'interface)
    const activeOrder = activeOrders[0] || null;

    // Vérifier si le livreur peut accepter de nouvelles commandes
    const MAX_ORDERS_PER_DRIVER = 5;
    const canAcceptNewOrders = activeOrders.length < MAX_ORDERS_PER_DRIVER;

    // 4. Récupérer tous les magasins actifs
    const stores = await prisma.store.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Compter les commandes actives par magasin
    const storesWithCounts = stores.map(store => {
      const activeOrdersCount = formattedOrders.filter(
        order => order.store.id === store.id
      ).length;
      
      return {
        id: store.id,
        name: store.name,
        activeOrdersCount,
      };
    });

    console.log('🔍 DEBUG - Magasins récupérés:', {
      total: storesWithCounts.length,
      details: storesWithCounts,
    });

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
      totalStores: storesWithCounts.length,
    };

    console.log('🚀 Driver map data:', {
      orders: formattedOrders.length,
      zones: formattedZones.length,
      drivers: formattedDrivers.length,
      stores: storesWithCounts.length,
      currentDriverZoneId,
      activeOrder,
      activeOrdersCount: activeOrders.length,
      maxOrdersPerDriver: MAX_ORDERS_PER_DRIVER,
      canAcceptNewOrders,
      stats,
    });

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        zones: formattedZones,
        drivers: formattedDrivers,
        stores: storesWithCounts,
        currentDriverZoneId,
        activeOrder, // La commande en cours du livreur (pour compatibilité)
        activeOrders, // Toutes les commandes actives du livreur
        activeOrdersCount: activeOrders.length,
        maxOrdersPerDriver: MAX_ORDERS_PER_DRIVER,
        canAcceptNewOrders, // false si le livreur a atteint le maximum
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
