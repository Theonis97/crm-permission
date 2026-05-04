import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fetchDriverStorePackDtos } from '@/lib/driver-store-packs';

/**
 * GET /api/mobile/store-products
 * Récupérer les produits du magasin du livreur pour les demandes d'approvisionnement
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'ID du livreur requis' },
        { status: 400 }
      );
    }

    console.log(`🔍 Récupération des produits du magasin pour le livreur: ${driverId}`);

    // 1. Récupérer le livreur et son magasin
    const driver = await prisma.deliveryPerson.findUnique({
      where: { id: driverId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!driver) {
      return NextResponse.json(
        { success: false, error: 'Livreur introuvable' },
        { status: 404 }
      );
    }

    if (!driver.store) {
      return NextResponse.json(
        { success: false, error: 'Aucun magasin assigné à ce livreur' },
        { status: 404 }
      );
    }

    console.log(`🏪 Magasin du livreur: ${driver.store.name} (${driver.store.id})`);

    // 2. Récupérer tous les produits du magasin avec leur stock
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: driver.store.id,
        stock: {
          gt: 0, // Seulement les produits en stock
        },
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
            linkedStorePackId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });

    console.log(`📦 Produits trouvés dans le magasin: ${storeProducts.length}`);

    const packs = await fetchDriverStorePackDtos(driver.store.id);

    // 3. Formater les produits pour l'interface (sans doublon proxy pack)
    const formattedProducts = storeProducts
      .filter((sp) => !sp.product.linkedStorePackId)
      .map((storeProduct) => {
        const pvCat = Number(storeProduct.product.prixVente)
        const prix =
          storeProduct.prixVente != null &&
          !Number.isNaN(Number(storeProduct.prixVente))
            ? Number(storeProduct.prixVente)
            : pvCat
        return {
      id: storeProduct.product.id,
      productId: storeProduct.product.id,
      name: storeProduct.product.name,
      productName: storeProduct.product.name,
      sku: storeProduct.product.sku,
      productSku: storeProduct.product.sku,
      description: storeProduct.product.description,
      productDescription: storeProduct.product.description,
      photos: storeProduct.product.photos || [],
      productImage: storeProduct.product.photos?.[0] || null,
      prixVente: prix,
      price: prix,
      warehousePrixVente: pvCat,
      stock: storeProduct.stock,
      storeStock: storeProduct.stock,
      minStock: storeProduct.minStock,
      maxStock: storeProduct.maxStock,
      category: storeProduct.product.category
        ? {
            id: storeProduct.product.category.id,
            name: storeProduct.product.category.name,
          }
        : {
            id: '',
            name: 'Non catégorisé',
          },
      categoryId: storeProduct.product.category?.id || '',
      categoryName: storeProduct.product.category?.name || 'Non catégorisé',
      variants: [], // TODO: Ajouter les variants si nécessaire
    }
    })

    console.log(`✅ Produits formatés: ${formattedProducts.length}`);

    return NextResponse.json({
      success: true,
      data: {
        products: formattedProducts,
        packs,
        store: {
          id: driver.store.id,
          name: driver.store.name,
        },
        driver: {
          id: driver.id,
          name: driver.name,
        },
        totalProducts: formattedProducts.length,
      },
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des produits du magasin:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la récupération des produits' },
      { status: 500 }
    );
  }
}
