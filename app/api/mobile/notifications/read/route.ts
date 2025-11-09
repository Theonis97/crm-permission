import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * POST /api/mobile/notifications/read
 * Marque toutes les notifications comme lues
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authResult = await verifyMobileAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const deliveryPerson = authResult.user;

    console.log(`✅ Marquage de toutes les notifications comme lues pour livreur ${deliveryPerson.id}`);

    // Marquer toutes les notifications non lues comme lues
    const result = await prisma.deliveryNotification.updateMany({
      where: {
        deliveryPersonId: deliveryPerson.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log(`✅ ${result.count} notifications marquées comme lues`);

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('❌ Erreur marquage notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors du marquage des notifications' },
      { status: 500 }
    );
  }
}
