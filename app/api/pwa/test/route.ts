import { NextResponse } from 'next/server';
import { pwaPushNotificationService } from '@/lib/pwa-push-notifications';

export async function GET() {
  try {
    console.log('🧪 Test des notifications PWA');
    
    // Obtenir les statistiques
    const stats = pwaPushNotificationService.getStats();
    console.log('📊 Statistiques:', stats);
    
    // Ajouter une subscription de test si aucune n'existe
    if (stats.totalSubscriptions === 0) {
      console.log('➕ Ajout d\'une subscription de test...');
      
      const testSubscription = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-' + Date.now(),
        keys: {
          p256dh: 'test-p256dh-key',
          auth: 'test-auth-key'
        }
      };
      
      pwaPushNotificationService.addSubscription('test-driver-id', testSubscription);
    }
    
    // Envoyer une notification de test
    const result = await pwaPushNotificationService.sendNotificationToAllDrivers({
      title: '🧪 Test Backend Direct',
      body: 'Notification envoyée directement depuis le backend',
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'TEST_BACKEND',
        url: '/dashboard'
      }
    });
    
    const newStats = pwaPushNotificationService.getStats();
    
    return NextResponse.json({
      success: true,
      message: `Test terminé - ${result} notification(s) envoyée(s)`,
      data: {
        notificationsSent: result,
        statsAvant: stats,
        statsApres: newStats
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur test PWA:', error);
    
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
