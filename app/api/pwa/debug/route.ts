import { NextResponse } from 'next/server';
import { pwaPushNotificationService } from '@/lib/pwa-push-notifications';

export async function GET() {
  try {
    const stats = await pwaPushNotificationService.getStats();
    
    // Obtenir les détails des subscriptions (sans exposer les clés sensibles)
    const subscriptionDetails = await Promise.all(
      stats.drivers.map(async (driverId) => {
        const subscription = await pwaPushNotificationService.getSubscription(driverId);
        return {
          driverId,
          endpoint: subscription?.endpoint || 'N/A',
          isTestSubscription: subscription?.endpoint.includes('test-endpoint') || false,
          hasKeys: !!(subscription?.keys?.p256dh && subscription?.keys?.auth)
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: {
        totalSubscriptions: stats.totalSubscriptions,
        drivers: stats.drivers,
        subscriptionDetails
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur debug PWA:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors du debug',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
