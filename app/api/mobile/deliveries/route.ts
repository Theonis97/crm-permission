import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';
import { calculateCommission } from '@/lib/commission-calculator';

/**
 * GET /api/mobile/deliveries
 * Récupère les livraisons EFFECTIVES du livreur groupées par date de livraison (deliveredAt)
 * Seules les commandes avec statut DELIVERED sont incluses pour une meilleure traçabilité des commissions
 * Inclut le statut de clôture pour chaque jour
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

    // Paramètres de requête
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30'); // 30 jours par défaut
    const offset = parseInt(searchParams.get('offset') || '0');

    // Calculer la plage de dates (derniers X jours)
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (limit + offset));
    startDate.setHours(0, 0, 0, 0);

    console.log(`🔍 Récupération livraisons pour ${user.name} du ${startDate.toISOString()} au ${endDate.toISOString()}`);

    // Récupérer uniquement les commandes LIVRÉES du livreur dans la période
    // Groupement par deliveredAt pour une meilleure traçabilité des commissions
    const orders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: user.id,
        status: 'DELIVERED', // Uniquement les commandes livrées
        deliveredAt: {
          gte: startDate,
          lte: endDate,
        },
      },
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
            variant: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
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
      orderBy: {
        deliveredAt: 'desc',
      },
    });

    // Récupérer les clôtures de journée existantes
    const dayShifts = await prisma.dayShift.findMany({
      where: {
        deliveryPersonId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Grouper les commandes par jour
    const deliveriesByDay = new Map<string, any>();

    orders.forEach(order => {
      // Grouper par date de livraison effective (deliveredAt)
      const orderDate = new Date(order.deliveredAt!); // ! car on filtre déjà sur DELIVERED
      const dayKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!deliveriesByDay.has(dayKey)) {
        deliveriesByDay.set(dayKey, {
          date: dayKey,
          displayDate: orderDate.toLocaleDateString('fr-FR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          orders: [],
          stats: {
            total: 0,
            delivered: 0,
            cancelled: 0,
            pending: 0,
            delivering: 0,
          },
          commission: 0,
          isClosed: false,
          closedAt: null,
        });
      }

      const dayData = deliveriesByDay.get(dayKey);
      
      // Ajouter la commande
      dayData.orders.push({
        id: order.id,
        orderNumber: order.number,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        deliveryAddress: order.deliveryAddress,
        status: order.status,
        statusLabel: getStatusLabel(order.status),
        statusColor: getStatusColor(order.status),
        total: order.total,
        commission: calculateCommission(order.total), // Toujours calculer car toutes les commandes sont DELIVERED
        itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
        items: order.items.map(item => ({
          id: item.id,
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
          total: item.total,
        })),
        deliveryZone: order.deliveryZone,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
      });

      // Mettre à jour les statistiques (toutes les commandes sont DELIVERED)
      dayData.stats.total++;
      dayData.stats.delivered++;
      dayData.commission += calculateCommission(order.total);
    });

    // Ajouter les informations de clôture
    dayShifts.forEach(shift => {
      const dayKey = shift.date.toISOString().split('T')[0];
      const dayData = deliveriesByDay.get(dayKey);
      
      if (dayData) {
        dayData.isClosed = true;
        dayData.closedAt = shift.date;
        // Utiliser les stats de la clôture si disponibles
        dayData.commission = shift.commission;
        dayData.stats = {
          total: shift.totalOrders,
          delivered: shift.deliveredOrders,
          cancelled: shift.cancelledOrders,
          pending: shift.reportedOrders,
          delivering: 0, // Les commandes en livraison ne sont pas dans les clôtures
        };
      }
    });

    // Convertir en array et trier par date décroissante
    const deliveriesArray = Array.from(deliveriesByDay.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculer les statistiques globales
    const globalStats = {
      totalDays: deliveriesArray.length,
      closedDays: deliveriesArray.filter(day => day.isClosed).length,
      totalOrders: deliveriesArray.reduce((sum, day) => sum + day.stats.total, 0),
      totalDelivered: deliveriesArray.reduce((sum, day) => sum + day.stats.delivered, 0),
      totalCommission: deliveriesArray.reduce((sum, day) => sum + day.commission, 0),
    };

    console.log(`✅ Livraisons récupérées: ${deliveriesArray.length} jours, ${globalStats.totalOrders} commandes`);

    return NextResponse.json({
      success: true,
      data: {
        deliveries: deliveriesArray,
        stats: globalStats,
        pagination: {
          limit,
          offset,
          hasMore: deliveriesArray.length === limit, // Approximation
        },
        driver: {
          id: user.id,
          name: user.name,
          storeId: user.storeId,
          storeName: user.storeName,
        },
      },
    });
  } catch (error) {
    console.error('❌ Erreur récupération livraisons:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des livraisons' 
      },
      { status: 500 }
    );
  }
}

/**
 * Obtenir le label du statut en français
 */
function getStatusLabel(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'CONFIRMED':
      return 'Confirmée';
    case 'PREPARING':
      return 'En préparation';
    case 'READY':
      return 'Prête';
    case 'DELIVERING':
      return 'En livraison';
    case 'DELIVERED':
      return 'Livrée';
    case 'CANCELLED':
      return 'Annulée';
    default:
      return status;
  }
}

/**
 * Obtenir la couleur du statut
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
      return '#f57c00';
    case 'CONFIRMED':
      return '#0a7ea4';
    case 'PREPARING':
      return '#1976d2';
    case 'READY':
      return '#2e7d32';
    case 'DELIVERING':
      return '#9c27b0';
    case 'DELIVERED':
      return '#4caf50';
    case 'CANCELLED':
      return '#c62828';
    default:
      return '#687076';
  }
}
