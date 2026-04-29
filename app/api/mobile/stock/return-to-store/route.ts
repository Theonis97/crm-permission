import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';
import { catalogPricesSnapshot } from '@/lib/store-product-pricing';

interface ReturnItem {
  stockId: string;
  productId: string;
  quantity: number;
}

interface ReturnToStoreRequest {
  driverId: string;
  storeId: string;
  notes?: string;
  items: ReturnItem[];
}

/**
 * POST /api/mobile/stock/return-to-store
 * Permet au livreur de retourner du stock au magasin
 * 
 * Logique:
 * 1. Décrémenter le stock du livreur (DeliveryPersonStock)
 * 2. Incrémenter le stock du magasin (StoreProduct)
 * 3. Créer un mouvement de stock pour le livreur (DeliveryStockMovement)
 */
export async function POST(request: NextRequest) {
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

    // Parser le body
    const body: ReturnToStoreRequest = await request.json();
    const { driverId, storeId, notes, items } = body;

    // Validation
    if (!driverId || !storeId || !items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Données manquantes: driverId, storeId et items sont requis',
        },
        { status: 400 }
      );
    }

    // Vérifier que le livreur correspond à l'utilisateur connecté
    if (driverId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vous ne pouvez retourner que votre propre stock',
        },
        { status: 403 }
      );
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          error: 'Magasin introuvable',
        },
        { status: 404 }
      );
    }

    console.log(`📦 [RETURN] Début du retour de stock pour le livreur ${user.name}`);
    console.log(`📦 [RETURN] Magasin destination: ${store.name} (${storeId})`);
    console.log(`📦 [RETURN] Nombre d'articles: ${items.length}`);

    // Traiter chaque item dans une transaction
    const results = await prisma.$transaction(async (tx) => {
      const processedItems = [];

      for (const item of items) {
        console.log(`  ➡️ Traitement produit ${item.productId} - Quantité: ${item.quantity}`);

        // 1. Vérifier et récupérer le stock du livreur
        const driverStock = await tx.deliveryPersonStock.findUnique({
          where: { id: item.stockId },
          include: {
            product: true,
          },
        });

        if (!driverStock) {
          throw new Error(`Stock livreur introuvable pour l'ID: ${item.stockId}`);
        }

        if (driverStock.deliveryPersonId !== driverId) {
          throw new Error(`Ce stock n'appartient pas au livreur`);
        }

        const availableQuantity = driverStock.quantity - driverStock.reserved;
        if (item.quantity > availableQuantity) {
          throw new Error(
            `Quantité insuffisante pour ${driverStock.product.name}. Disponible: ${availableQuantity}, Demandé: ${item.quantity}`
          );
        }

        // 2. DÉCRÉMENTER le stock du livreur
        const newDriverQuantity = driverStock.quantity - item.quantity;
        
        if (newDriverQuantity <= 0) {
          // Supprimer l'entrée si le stock tombe à 0
          await tx.deliveryPersonStock.delete({
            where: { id: item.stockId },
          });
          console.log(`    🗑️ Stock livreur supprimé (quantité = 0)`);
        } else {
          await tx.deliveryPersonStock.update({
            where: { id: item.stockId },
            data: { quantity: newDriverQuantity },
          });
          console.log(`    📉 Stock livreur: ${driverStock.quantity} → ${newDriverQuantity} (-${item.quantity})`);
        }

        // 3. INCRÉMENTER le stock du magasin (StoreProduct)
        const existingStoreProduct = await tx.storeProduct.findFirst({
          where: {
            storeId: storeId,
            productId: item.productId,
          },
        });

        if (existingStoreProduct) {
          const newStoreStock = existingStoreProduct.stock + item.quantity;
          await tx.storeProduct.update({
            where: { id: existingStoreProduct.id },
            data: { stock: newStoreStock },
          });
          console.log(`    📈 Stock magasin: ${existingStoreProduct.stock} → ${newStoreStock} (+${item.quantity})`);
        } else {
          // Créer un nouveau StoreProduct si le produit n'existe pas dans le magasin
          const p = await tx.product.findUnique({
            where: { id: item.productId },
            select: { prixVente: true, prixAchat: true },
          });
          await tx.storeProduct.create({
            data: {
              storeId: storeId,
              productId: item.productId,
              stock: item.quantity,
              minStock: 10,
              ...(p ? catalogPricesSnapshot(p) : {}),
            },
          });
          console.log(`    🆕 Nouveau StoreProduct créé avec stock: ${item.quantity}`);
        }

        // 4. CRÉER un mouvement de stock pour le livreur (sortie)
        // Note: createdById n'est pas utilisé car user est un DeliveryPerson, pas un User
        await tx.deliveryStockMovement.create({
          data: {
            deliveryPersonId: driverId,
            productId: item.productId,
            variantId: driverStock.variantId,
            quantity: -item.quantity, // Négatif = sortie
            type: 'RETURN',
            notes: notes || `Retour au magasin ${store.name} par ${user.name}`,
          },
        });
        console.log(`    📝 Mouvement créé: RETURN -${item.quantity}`);

        processedItems.push({
          productId: item.productId,
          productName: driverStock.product.name,
          quantity: item.quantity,
          success: true,
        });
      }

      return processedItems;
    });

    console.log(`✅ [RETURN] Retour terminé - ${results.length} produits traités`);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Retour au magasin effectué avec succès',
        itemsProcessed: results.length,
        items: results,
        store: {
          id: store.id,
          name: store.name,
        },
      },
    });
  } catch (error: any) {
    console.error('❌ [RETURN] Erreur:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du retour au magasin',
      },
      { status: 500 }
    );
  }
}
