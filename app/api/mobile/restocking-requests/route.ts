import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyStoreAndWarehouse } from '@/lib/stock-flow-notifications';

/**
 * POST /api/mobile/restocking-requests
 * Créer une demande d'approvisionnement depuis l'app mobile du livreur
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, storeId, items, notes } = body;

    console.log('📦 Nouvelle demande d\'approvisionnement:', {
      driverId,
      storeId,
      itemsCount: items?.length || 0,
      notes: notes?.substring(0, 50) || 'Aucune note'
    });

    // Validation des champs requis
    if (!driverId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Champs requis manquants (driverId, items)' 
        },
        { status: 400 }
      );
    }

    // Vérifier que le livreur existe
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

    // Utiliser le magasin du livreur si storeId n'est pas fourni
    const targetStoreId = storeId || driver.store.id;

    console.log(`🏪 Demande d'approvisionnement pour le magasin: ${driver.store.name} (${targetStoreId})`);

    // Valider les items de la demande
    const validatedItems = [];
    for (const item of items) {
      const { productId, quantity } = item;

      if (!productId || !quantity || quantity <= 0) {
        console.warn(`⚠️ Item invalide ignoré:`, item);
        continue;
      }

      // Vérifier que le produit existe
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          sku: true,
        },
      });

      if (!product) {
        console.warn(`⚠️ Produit introuvable: ${productId}`);
        continue;
      }

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        quantity: parseInt(quantity),
        notes: item.notes || null,
      });
    }

    if (validatedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Aucun item valide dans la demande' },
        { status: 400 }
      );
    }

    console.log(`✅ Items validés: ${validatedItems.length}`);

    // Créer la demande d'approvisionnement
    const restockingRequest = await prisma.restockingRequest.create({
      data: {
        deliveryPersonId: driverId,
        storeId: targetStoreId,
        status: 'PENDING',
        notes: notes || null,
        items: {
          create: validatedItems.map(item => ({
            productId: item.productId,
            requestedQuantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
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
    });

    console.log(`✅ Demande d'approvisionnement créée: ${restockingRequest.id}`);

    const totalQty = restockingRequest.items.reduce((s, i) => s + i.requestedQuantity, 0);
    void notifyStoreAndWarehouse(restockingRequest.storeId, {
      title: 'Réapprovisionnement (livreur)',
      body: `${restockingRequest.deliveryPerson.name} — ${restockingRequest.store.name} · ${restockingRequest.items.length} réf. · ${totalQty} unité(s)`,
      data: {
        type: 'DRIVER_RESTOCK',
        requestId: restockingRequest.id,
        storeId: restockingRequest.storeId,
      },
    }).catch((err) => console.error('[notify DRIVER_RESTOCK mobile]', err));

    return NextResponse.json({
      success: true,
      data: {
        id: restockingRequest.id,
        status: restockingRequest.status,
        deliveryPerson: restockingRequest.deliveryPerson,
        store: restockingRequest.store,
        itemsCount: restockingRequest.items.length,
        items: restockingRequest.items.map(item => ({
          id: item.id,
          productId: item.productId,
          productName: item.product.name,
          productSku: item.product.sku,
          requestedQuantity: item.requestedQuantity,
          notes: item.notes,
        })),
        createdAt: restockingRequest.createdAt,
        notes: restockingRequest.notes,
      },
      message: `Demande d'approvisionnement créée avec succès`,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création de la demande d\'approvisionnement:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur serveur lors de la création de la demande',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/restocking-requests
 * Récupérer les demandes d'approvisionnement d'un livreur
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'ID du livreur requis' },
        { status: 400 }
      );
    }

    console.log(`📋 Récupération des demandes d'approvisionnement pour le livreur: ${driverId}`);

    const whereClause: any = {
      deliveryPersonId: driverId,
    };

    if (status) {
      whereClause.status = status;
    }

    const restockingRequests = await prisma.restockingRequest.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
              },
            },
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    console.log(`✅ Demandes trouvées: ${restockingRequests.length}`);

    const formattedRequests = restockingRequests.map((request: any) => ({
      id: request.id,
      status: request.status,
      store: request.store,
      deliveryPerson: request.deliveryPerson,
      itemsCount: request.items.length,
      items: request.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productSku: item.product.sku,
        productImage: item.product.photos?.[0] || null,
        requestedQuantity: item.requestedQuantity,
        approvedQuantity: item.approvedQuantity,
        notes: item.notes,
      })),
      notes: request.notes,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      approvedAt: request.approvedAt,
      completedAt: request.completedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests: formattedRequests,
        total: formattedRequests.length,
      },
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des demandes d\'approvisionnement:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur serveur lors de la récupération des demandes' },
      { status: 500 }
    );
  }
}
