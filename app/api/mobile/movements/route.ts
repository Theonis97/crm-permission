import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/movements
 * Récupère les mouvements de stock du livreur connecté
 */
export async function GET(request: NextRequest) {
  try {
    // Authentifier le livreur
    const { user, error } = await authenticateMobileUser(request);

    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error: error || 'Non authentifié',
        },
        { status: 401 }
      );
    }

    // Extraire les paramètres de requête
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // SUPPLY, SALE, RETURN, ADJUSTMENT
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Construire le filtre
    const where: any = {
      deliveryPersonId: user.id,
    };

    if (type && type !== 'all') {
      where.type = type;
    }

    // Récupérer les mouvements avec les détails
    const movements = await prisma.deliveryStockMovement.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            photos: true,
            prixVente: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            images: true,
            prixVente: true,
          },
        },
        storeOrder: {
          select: {
            id: true,
            number: true,
            customerName: true,
            total: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Compter le total
    const totalCount = await prisma.deliveryStockMovement.count({ where });

    // Calculer les statistiques par type
    const stats = await prisma.deliveryStockMovement.groupBy({
      by: ['type'],
      where: {
        deliveryPersonId: user.id,
      },
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
    });

    // Formater les statistiques
    const formattedStats = {
      total: totalCount,
      supply: stats.find(s => s.type === 'SUPPLY')?._count.id || 0,
      sale: stats.find(s => s.type === 'SALE')?._count.id || 0,
      return: stats.find(s => s.type === 'RETURN')?._count.id || 0,
      adjustment: stats.find(s => s.type === 'ADJUSTMENT')?._count.id || 0,
      totalSupplyQuantity: stats.find(s => s.type === 'SUPPLY')?._sum.quantity || 0,
      totalSaleQuantity: Math.abs(stats.find(s => s.type === 'SALE')?._sum.quantity || 0),
      totalReturnQuantity: Math.abs(stats.find(s => s.type === 'RETURN')?._sum.quantity || 0),
    };

    // Formatter les mouvements pour le mobile
    const formattedMovements = movements.map(movement => {
      const productImage = (movement.variant?.images && movement.variant.images.length > 0)
        ? movement.variant.images[0]
        : (movement.product.photos && movement.product.photos.length > 0)
          ? movement.product.photos[0]
          : null;

      const price = movement.variant?.prixVente || movement.product.prixVente || 0;
      const totalValue = Math.abs(movement.quantity) * price;

      // Déterminer le label du type
      let typeLabel = '';
      let typeColor = '';
      switch (movement.type) {
        case 'SUPPLY':
          typeLabel = 'Approvisionnement';
          typeColor = '#2e7d32';
          break;
        case 'SALE':
          typeLabel = 'Vente';
          typeColor = '#0a7ea4';
          break;
        case 'RETURN':
          typeLabel = 'Retour';
          typeColor = '#f57c00';
          break;
        case 'ADJUSTMENT':
          typeLabel = 'Ajustement';
          typeColor = '#9c27b0';
          break;
      }

      return {
        id: movement.id,
        type: movement.type,
        typeLabel,
        typeColor,
        productId: movement.product.id,
        productName: movement.product.name,
        productSku: movement.variant?.sku || movement.product.sku || '',
        productImage,
        category: movement.product.category?.name || 'Non catégorisé',
        variant: movement.variant ? {
          id: movement.variant.id,
          name: movement.variant.name,
        } : null,
        quantity: movement.quantity,
        quantityAbs: Math.abs(movement.quantity),
        price,
        totalValue,
        storeOrder: movement.storeOrder ? {
          id: movement.storeOrder.id,
          orderNumber: movement.storeOrder.number,
          customerName: movement.storeOrder.customerName,
          totalAmount: movement.storeOrder.total,
        } : null,
        notes: movement.notes,
        createdBy: movement.createdBy ? {
          id: movement.createdBy.id,
          name: movement.createdBy.name || `${movement.createdBy.firstName || ''} ${movement.createdBy.lastName || ''}`.trim(),
        } : null,
        createdAt: movement.createdAt,
      };
    });

    console.log(`✅ Movements retrieved for driver: ${user.name} - ${formattedMovements.length} items`);

    return NextResponse.json({
      success: true,
      data: {
        movements: formattedMovements,
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
        },
      },
    });
  } catch (error) {
    console.error('❌ Get movements error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des mouvements',
      },
      { status: 500 }
    );
  }
}
