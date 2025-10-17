import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser, hasRole } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/orders
 * Récupère les commandes de la zone du livreur connecté
 * Le matching est basé sur le nom du lieu de livraison
 */
export async function GET(request: NextRequest) {
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

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // PENDING, PROCESSING, READY, DELIVERED, etc.
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Récupérer la zone du livreur
    const deliveryZone = await prisma.deliveryZone.findFirst({
      where: {
        deliveryPersonId: user.id,
        isActive: true,
      },
    });

    console.log(`🔍 Recherche commandes pour livreur: ${user.name} (ID: ${user.id})`);
    console.log(`   Zone: ${deliveryZone ? `${deliveryZone.name} (${deliveryZone.id})` : 'Aucune zone assignée'}`);

    // Construire le filtre des commandes
    const where: any = {
      storeId: user.storeId, // Commandes du même magasin
      OR: [
        // 1. Commandes directement assignées au livreur
        { deliveryPersonId: user.id },
        // 2. Commandes de la zone du livreur
        ...(deliveryZone ? [{ deliveryZoneId: deliveryZone.id }] : []),
      ],
    };

    // Filtrer par statut si spécifié
    if (status && status !== 'all') {
      where.status = status;
    }
    // Si 'all', on ne filtre pas par statut (toutes les commandes)

    // Si le livreur a une zone, ajouter le matching textuel sur l'adresse
    if (deliveryZone) {
      // Récupérer toutes les commandes du magasin avec adresse
      const allOrders = await prisma.storeOrder.findMany({
        where: {
          storeId: user.storeId,
          deliveryAddress: { not: null },
          ...(status && status !== 'all' ? { status: status as any } : {}),
        },
        select: {
          id: true,
          deliveryAddress: true,
        },
      });

      // Filtrer celles dont l'adresse contient le nom de la zone ou sa couverture
      const zoneName = deliveryZone.name.toLowerCase();
      const zoneCoverage = deliveryZone.coverage?.toLowerCase() || '';
      
      const matchingOrderIds = allOrders
        .filter(order => {
          const address = order.deliveryAddress?.toLowerCase() || '';
          return (
            address.includes(zoneName) ||
            (zoneCoverage && address.includes(zoneCoverage))
          );
        })
        .map(order => order.id);

      // Ajouter ces IDs au filtre OR
      if (matchingOrderIds.length > 0) {
        where.OR.push({ id: { in: matchingOrderIds } });
        console.log(`   ✓ ${matchingOrderIds.length} commandes matchées par adresse`);
      } else {
        console.log(`   ✗ Aucune commande matchée par adresse`);
      }
    }

    // Récupérer les commandes avec tous les détails
    const orders = await prisma.storeOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                images: true,
                prixVente: true,
              },
            },
          },
        },
        deliveryZone: {
          select: {
            id: true,
            name: true,
            color: true,
            deliveryFee: true,
            estimatedTime: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });

    // Compter le total
    const totalCount = await prisma.storeOrder.count({ where });

    // Calculer les statistiques par statut
    const stats = await prisma.storeOrder.groupBy({
      by: ['status'],
      where: {
        storeId: user.storeId,
        OR: where.OR,
      },
      _count: {
        id: true,
      },
    });

    // Formater les statistiques
    const formattedStats = {
      total: totalCount,
      pending: stats.find(s => s.status === 'PENDING')?._count.id || 0,
      confirmed: stats.find(s => s.status === 'CONFIRMED')?._count.id || 0,
      preparing: stats.find(s => s.status === 'PREPARING')?._count.id || 0,
      ready: stats.find(s => s.status === 'READY')?._count.id || 0,
      delivering: stats.find(s => s.status === 'DELIVERING')?._count.id || 0,
      delivered: stats.find(s => s.status === 'DELIVERED')?._count.id || 0,
      cancelled: stats.find(s => s.status === 'CANCELLED')?._count.id || 0,
    };

    // Formatter les commandes pour le mobile
    const formattedOrders = orders.map(order => {
      // Calculer le nombre d'articles
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      // Déterminer le label et la couleur du statut
      let statusLabel = '';
      let statusColor = '';
      switch (order.status) {
        case 'PENDING':
          statusLabel = 'En attente';
          statusColor = '#f57c00';
          break;
        case 'CONFIRMED':
          statusLabel = 'Confirmée';
          statusColor = '#0a7ea4';
          break;
        case 'PREPARING':
          statusLabel = 'En préparation';
          statusColor = '#1976d2';
          break;
        case 'READY':
          statusLabel = 'Prête';
          statusColor = '#2e7d32';
          break;
        case 'DELIVERING':
          statusLabel = 'En livraison';
          statusColor = '#9c27b0';
          break;
        case 'DELIVERED':
          statusLabel = 'Livrée';
          statusColor = '#4caf50';
          break;
        case 'CANCELLED':
          statusLabel = 'Annulée';
          statusColor = '#c62828';
          break;
        default:
          statusLabel = order.status;
          statusColor = '#687076';
      }

      return {
        id: order.id,
        orderNumber: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        deliveryAddress: order.deliveryAddress,
        deliveryLatitude: order.deliveryLatitude,
        deliveryLongitude: order.deliveryLongitude,
        status: order.status,
        statusLabel,
        statusColor,
        priority: order.priority,
        subtotal: order.subtotal,
        totalDiscount: order.totalDiscount,
        totalTax: order.totalTax,
        deliveryFee: order.deliveryFee,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        itemCount,
        items: order.items.map(item => ({
          id: item.id,
          productId: item.product.id,
          productName: item.product.name,
          productImage: (item.variant?.images && item.variant.images.length > 0)
            ? item.variant.images[0]
            : (item.product.photos && item.product.photos.length > 0)
              ? item.product.photos[0]
              : null,
          variant: item.variant ? {
            id: item.variant.id,
            name: item.variant.name,
          } : null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          taxRate: item.taxRate,
          total: item.total,
        })),
        deliveryZone: order.deliveryZone ? {
          id: order.deliveryZone.id,
          name: order.deliveryZone.name,
          color: order.deliveryZone.color,
          deliveryFee: order.deliveryZone.deliveryFee,
          estimatedTime: order.deliveryZone.estimatedTime,
        } : null,
        deliveryPerson: order.deliveryPerson ? {
          id: order.deliveryPerson.id,
          name: order.deliveryPerson.name,
          phone: order.deliveryPerson.phone,
        } : null,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    console.log(`✅ Orders retrieved for driver: ${user.name} (Zone: ${deliveryZone?.name || 'N/A'})`);
    console.log(`   - Total: ${formattedOrders.length} commandes`);
    console.log(`   - Statuts: PENDING=${formattedStats.pending}, CONFIRMED=${formattedStats.confirmed}, PREPARING=${formattedStats.preparing}, READY=${formattedStats.ready}, DELIVERING=${formattedStats.delivering}, DELIVERED=${formattedStats.delivered}, CANCELLED=${formattedStats.cancelled}`);

    return NextResponse.json({
      success: true,
      data: {
        orders: formattedOrders,
        stats: formattedStats,
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + limit < totalCount,
        },
        driver: {
          id: user.id,
          name: user.name,
          storeId: user.storeId,
          storeName: user.storeName,
          zone: deliveryZone ? {
            id: deliveryZone.id,
            name: deliveryZone.name,
            color: deliveryZone.color,
          } : null,
        },
      },
    });
  } catch (error) {
    console.error('❌ Get orders error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des commandes' 
      },
      { status: 500 }
    );
  }
}
