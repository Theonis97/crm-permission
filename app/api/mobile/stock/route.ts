import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/stock
 * Récupère le stock du livreur connecté
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

    // Récupérer le stock du livreur avec les détails des produits
    const stock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId: user.id,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            description: true,
            photos: true,
            prixVente: true,
            prixAchat: true,
            tva: true,
            stock: true,
            minStock: true,
            maxStock: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            brand: {
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
            sku: true,
            name: true,
            prixVente: true,
            prixAchat: true,
            attributes: true,
            images: true,
            stock: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        {
          product: {
            name: 'asc',
          },
        },
      ],
    });

    // Calculer les statistiques
    const stats = {
      totalProducts: stock.length,
      totalQuantity: stock.reduce((sum, item) => sum + item.quantity, 0),
      totalReserved: stock.reduce((sum, item) => sum + item.reserved, 0),
      totalAvailable: stock.reduce((sum, item) => sum + (item.quantity - item.reserved), 0),
      lowStock: stock.filter(item => {
        const available = item.quantity - item.reserved;
        const minQuantity = item.product.minStock || 5;
        return available > 0 && available <= minQuantity;
      }).length,
      outOfStock: stock.filter(item => item.quantity - item.reserved <= 0).length,
    };

    // Calculer la valeur totale du stock
    const totalValue = stock.reduce((sum, item) => {
      const price = item.variant?.prixVente || item.product.prixVente || 0;
      const available = item.quantity - item.reserved;
      return sum + (price * available);
    }, 0);

    // Formatter les données pour le mobile
    const formattedStock = stock.map(item => {
      const available = item.quantity - item.reserved;
      const price = item.variant?.prixVente || item.product.prixVente || 0;
      const productImage = (item.variant?.images && item.variant.images.length > 0) 
        ? item.variant.images[0] 
        : (item.product.photos && item.product.photos.length > 0) 
          ? item.product.photos[0] 
          : null;

      return {
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.variant?.sku || item.product.sku || '',
        productBarcode: null, // Pas de barcode dans le schéma
        productImage,
        category: item.product.category?.name || 'Non catégorisé',
        brand: item.product.brand?.name || null,
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          attributes: item.variant.attributes,
        } : null,
        quantity: item.quantity,
        reserved: item.reserved,
        available,
        unit: 'unité(s)', // Pas de champ unit dans le schéma
        price,
        totalValue: price * available,
        minOrderQuantity: item.product.minStock || null,
        maxOrderQuantity: item.product.maxStock || null,
        isLowStock: available > 0 && available <= (item.product.minStock || 5),
        isOutOfStock: available <= 0,
        isActive: item.variant?.isActive ?? true, // Les produits n'ont pas de champ isActive
        updatedAt: item.updatedAt,
      };
    });

    console.log(`✅ Stock retrieved for driver: ${user.name} - ${formattedStock.length} items`);

    return NextResponse.json({
      success: true,
      data: {
        stock: formattedStock,
        stats: {
          ...stats,
          totalValue,
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
    console.error('❌ Get stock error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération du stock',
      },
      { status: 500 }
    );
  }
}
