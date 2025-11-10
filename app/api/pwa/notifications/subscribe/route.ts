import { NextRequest, NextResponse } from 'next/server';
import { pwaPushNotificationService } from '@/lib/pwa-push-notifications';
import { verifyMobileAuth } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification et obtenir l'utilisateur
    const authResult = await verifyMobileAuth(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentification échouée' },
        { status: 401 }
      );
    }

    const deliveryPersonId = authResult.user.id;
    
    console.log(`🔍 Tentative d'enregistrement PWA subscription pour deliveryPersonId: ${deliveryPersonId}`);
    
    // Récupérer l'utilisateur depuis le DeliveryPerson
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
      select: { 
        id: true, 
        name: true, 
        email: true
      }
    });
    
    if (!deliveryPerson) {
      console.error(`❌ DeliveryPerson ${deliveryPersonId} non trouvé en base de données`);
      return NextResponse.json(
        { success: false, error: 'Livreur non trouvé en base de données' },
        { status: 404 }
      );
    }
    
    // Trouver l'utilisateur correspondant par email
    const user = await prisma.user.findUnique({
      where: { email: deliveryPerson.email },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    
    if (!user) {
      console.error(`❌ Utilisateur avec email ${deliveryPerson.email} non trouvé`);
      return NextResponse.json(
        { success: false, error: 'Utilisateur correspondant non trouvé' },
        { status: 404 }
      );
    }
    
    const userId = user.id;
    console.log(`✅ Livreur trouvé: ${deliveryPerson.name} (${deliveryPerson.id})`);
    console.log(`✅ Utilisateur correspondant: ${user.email} (${user.id})`);
    
    // Récupérer les données de la subscription
    const body = await request.json();
    const { subscription, driverId } = body;

    // Vérifier que le driverId correspond au livreur authentifié (si fourni)
    if (driverId && driverId !== deliveryPersonId && driverId !== userId) {
      return NextResponse.json(
        { success: false, error: 'driverId ne correspond pas à l\'utilisateur authentifié' },
        { status: 403 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'Subscription requise' },
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

    // Récupérer le User-Agent
    const userAgent = request.headers.get('user-agent') || undefined;

    // Ajouter la subscription au service
    await pwaPushNotificationService.addSubscription(userId, subscription, userAgent);

    console.log(`📱 Nouvelle PWA subscription enregistrée pour l'utilisateur ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription PWA enregistrée avec succès',
      data: {
        userId,
        subscribed: true,
        stats: await pwaPushNotificationService.getStats()
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
    // Vérifier l'authentification et obtenir l'utilisateur
    const authResult = await verifyMobileAuth(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: authResult.error || 'Authentification échouée' },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    // Supprimer la subscription
    await pwaPushNotificationService.removeSubscription(userId);

    console.log(`📱 PWA Subscription supprimée pour l'utilisateur ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription PWA supprimée avec succès',
      data: {
        userId,
        subscribed: false,
        stats: await pwaPushNotificationService.getStats()
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
