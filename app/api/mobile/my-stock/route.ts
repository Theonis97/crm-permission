import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/my-stock
 * Récupérer le stock du livreur avec les produits et catégories
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

    // Récupérer le stock du livreur avec les produits et catégories
    const stock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId: user.id,
        quantity: {
          gt: 0, // Uniquement les produits en stock
        },
      },
      include: {
        product: {
          include: {
            category: true,
            images: true,
          },
        },
        variant: true,
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });

    // Grouper par catégorie
    const productsByCategory: Record<string, any[]> = {};
    const categories = new Set<string>();

    for (const item of stock) {
      const categoryName = item.product.category?.name || 'Sans catégorie';
      categories.add(categoryName);

      if (!productsByCategory[categoryName]) {
        productsByCategory[categoryName] = [];
      }

      productsByCategory[categoryName].push({
        id: item.product.id,
        stockId: item.id,
        name: item.product.name,
        sku: item.product.sku,
        description: item.product.description,
        price: item.variant?.price || item.product.prixVente,
        category: categoryName,
        quantity: item.quantity,
        reserved: item.reserved,
        available: item.quantity - item.reserved,
        photo: item.product.photos?.[0] || null,
        variant: item.variant ? {
          id: item.variant.id,
          name: item.variant.name,
          attributes: item.variant.attributes,
        } : null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        products: stock.map(item => ({
          id: item.product.id,
          stockId: item.id,
          name: item.product.name,
          sku: item.product.sku,
          description: item.product.description,
          price: item.variant?.price || item.product.prixVente,
          category: item.product.category?.name || 'Sans catégorie',
          quantity: item.quantity,
          reserved: item.reserved,
          available: item.quantity - item.reserved,
          photo: item.product.photos?.[0] || null,
          variant: item.variant ? {
            id: item.variant.id,
            name: item.variant.name,
            attributes: item.variant.attributes,
          } : null,
        })),
        categories: Array.from(categories),
        productsByCategory,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur récupération stock:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération du stock' 
      },
      { status: 500 }
    );
  }
}

