import { NextRequest, NextResponse } from 'next/server';
import { pwaPushNotificationService } from '@/lib/pwa-push-notifications';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data, driverId, targetDriverIds } = body;

    let result = 0;

    switch (type) {
      case 'NEW_ORDER':
        if (!data.orderNumber || !data.customerName || !data.address || !data.total) {
          return NextResponse.json(
            { success: false, error: 'Données de commande incomplètes' },
            { status: 400 }
          );
        }
        result = await pwaPushNotificationService.notifyNewOrderToZone(data, targetDriverIds);
        break;

      case 'URGENT_ORDER':
        if (!data.orderNumber || !data.customerName || !data.address || !data.total) {
          return NextResponse.json(
            { success: false, error: 'Données de commande incomplètes' },
            { status: 400 }
          );
        }
        result = await pwaPushNotificationService.notifyUrgentOrderToZone(data, targetDriverIds);
        break;

      case 'CUSTOM':
        if (!data.title || !data.body) {
          return NextResponse.json(
            { success: false, error: 'Titre et message requis pour notification personnalisée' },
            { status: 400 }
          );
        }
        
        if (driverId) {
          // Envoyer à un livreur spécifique
          const success = await pwaPushNotificationService.sendNotificationToDriver(driverId, data);
          result = success ? 1 : 0;
        } else {
          // Envoyer à tous les livreurs
          result = await pwaPushNotificationService.sendNotificationToAllDrivers(data);
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Type de notification non supporté' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Notification PWA envoyée à ${result} livreur(s)`,
      data: {
        type,
        sentTo: result,
        stats: pwaPushNotificationService.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification PWA:', error);
    
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
