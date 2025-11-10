import { NextRequest, NextResponse } from 'next/server';
import { pwaPushNotificationService } from '@/lib/pwa-push-notifications';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification du webhook (optionnel)
    const authHeader = request.headers.get('authorization');
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { order, type = 'NEW_ORDER', zoneId } = body;

    // Valider les données de la commande
    if (!order || !order.number || !order.customerName || !order.address || !order.total) {
      return NextResponse.json(
        { success: false, error: 'Données de commande incomplètes' },
        { status: 400 }
      );
    }

    console.log(`📦 Nouvelle commande reçue via webhook PWA: ${order.number}`);

    let notificationsSent = 0;
    let targetDriverIds: string[] = [];

    // Si une zone est spécifiée, récupérer les livreurs de cette zone
    if (zoneId) {
      try {
        const driversInZone = await prisma.user.findMany({
          where: {
            userRoles: {
              some: {
                role: {
                  name: 'DELIVERY_PERSON'
                }
              }
            },
            status: 'ACTIVE'
          },
          select: {
            id: true
          }
        });
        
        targetDriverIds = driversInZone.map(driver => driver.id);
        console.log(`🎯 Ciblage de ${targetDriverIds.length} livreurs dans la zone ${zoneId}`);
      } catch (error) {
        console.error('❌ Erreur récupération livreurs de la zone:', error);
        // Continuer sans ciblage spécifique
      }
    }

    // Envoyer notification selon le type
    if (type === 'URGENT_ORDER') {
      notificationsSent = await pwaPushNotificationService.notifyUrgentOrderToZone({
        orderNumber: order.number,
        customerName: order.customerName,
        address: order.address,
        total: order.total,
        zoneId
      }, targetDriverIds.length > 0 ? targetDriverIds : undefined);
    } else {
      notificationsSent = await pwaPushNotificationService.notifyNewOrderToZone({
        orderNumber: order.number,
        customerName: order.customerName,
        address: order.address,
        total: order.total,
        zoneId
      }, targetDriverIds.length > 0 ? targetDriverIds : undefined);
    }

    console.log(`📱 Notifications PWA envoyées à ${notificationsSent} livreur(s)`);

    return NextResponse.json({
      success: true,
      message: `Notifications PWA envoyées à ${notificationsSent} livreur(s)`,
      data: {
        orderNumber: order.number,
        type,
        zoneId,
        targetDriverIds: targetDriverIds.length > 0 ? targetDriverIds : 'all',
        notificationsSent,
        stats: pwaPushNotificationService.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Erreur webhook nouvelle commande PWA:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Endpoint GET pour tester le webhook
export async function GET() {
  try {
    // Données de test
    const testOrder = {
      number: 'CMD-PWA-TEST-' + Date.now(),
      customerName: 'Client Test PWA',
      address: 'Libreville, Gabon',
      total: 15000
    };

    const notificationsSent = await pwaPushNotificationService.notifyNewOrderToZone({
      orderNumber: testOrder.number,
      customerName: testOrder.customerName,
      address: testOrder.address,
      total: testOrder.total
    });

    return NextResponse.json({
      success: true,
      message: `Test notification PWA envoyée à ${notificationsSent} livreur(s)`,
      data: {
        testOrder,
        notificationsSent,
        stats: pwaPushNotificationService.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Erreur test webhook PWA:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du test',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
