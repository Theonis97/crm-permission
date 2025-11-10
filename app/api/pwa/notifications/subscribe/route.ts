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

    const token = authHeader.split(' ')[1];
    
    // Récupérer les données de la subscription
    const body = await request.json();
    const { subscription, driverId } = body;

    if (!subscription || !driverId) {
      return NextResponse.json(
        { success: false, error: 'Subscription et driverId requis' },
        { status: 400 }
      );
    }

    // Valider la structure de la subscription
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { success: false, error: 'Format de subscription invalide' },
        { status: 400 }
      );
    }

    // Ajouter la subscription au service
    pwaPushNotificationService.addSubscription(driverId, subscription);

    console.log(`📱 Nouvelle PWA subscription enregistrée pour le livreur ${driverId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription PWA enregistrée avec succès',
      data: {
        driverId,
        subscribed: true,
        stats: pwaPushNotificationService.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement de la PWA subscription:', error);
    
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

export async function DELETE(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');

    if (!driverId) {
      return NextResponse.json(
        { success: false, error: 'driverId requis' },
        { status: 400 }
      );
    }

    // Supprimer la subscription
    pwaPushNotificationService.removeSubscription(driverId);

    console.log(`📱 PWA Subscription supprimée pour le livreur ${driverId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription PWA supprimée avec succès',
      data: {
        driverId,
        subscribed: false,
        stats: pwaPushNotificationService.getStats()
      }
    });

  } catch (error) {
    console.error('❌ Erreur lors de la suppression de la PWA subscription:', error);
    
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
