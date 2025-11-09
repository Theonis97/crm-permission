import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * POST /api/mobile/fcm-token/delete
 * Supprimer un token FCM
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authResult = await verifyMobileAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 400 }
      );
    }

    console.log('🗑️ Suppression token FCM:', token.substring(0, 30) + '...');

    // Désactiver le token au lieu de le supprimer (pour historique)
    const result = await prisma.deliveryPersonPushToken.updateMany({
      where: {
        token,
        deliveryPersonId: authResult.user.id,
      },
      data: {
        isActive: false,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: 'Token non trouvé' },
        { status: 404 }
      );
    }

    console.log('✅ Token FCM désactivé');

    return NextResponse.json({
      success: true,
      data: { message: 'Token supprimé avec succès' },
    });
  } catch (error) {
    console.error('❌ Erreur suppression token FCM:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la suppression du token',
      },
      { status: 500 }
    );
  }
}
