import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * POST /api/mobile/fcm-token
 * Enregistrer un token FCM pour un livreur
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

    const { token, deviceId, platform } = await request.json();

    // Validation
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token manquant' },
        { status: 400 }
      );
    }

    const deliveryPersonId = authResult.user.id;

    console.log('📱 Enregistrement token FCM:', {
      deliveryPersonId,
      deviceId,
      platform,
      tokenPreview: token.substring(0, 30) + '...',
    });

    // Vérifier si le token existe déjà
    const existingToken = await prisma.deliveryPersonPushToken.findUnique({
      where: { token },
    });

    if (existingToken) {
      // Mettre à jour le token existant
      const updated = await prisma.deliveryPersonPushToken.update({
        where: { token },
        data: {
          deliveryPersonId,
          deviceId,
          platform,
          isActive: true,
          lastUsedAt: new Date(),
        },
      });

      console.log('✅ Token FCM mis à jour:', updated.id);

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          message: 'Token mis à jour avec succès',
        },
      });
    }

    // Créer un nouveau token
    const newToken = await prisma.deliveryPersonPushToken.create({
      data: {
        deliveryPersonId,
        token,
        deviceId,
        platform,
        isActive: true,
      },
    });

    console.log('✅ Token FCM créé:', newToken.id);

    return NextResponse.json({
      success: true,
      data: {
        id: newToken.id,
        message: 'Token enregistré avec succès',
      },
    });
  } catch (error) {
    console.error('❌ Erreur enregistrement token FCM:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de l\'enregistrement du token',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/mobile/fcm-token
 * Obtenir les tokens FCM d'un livreur
 */
export async function GET(request: NextRequest) {
  try {
    // Vérifier l'authentification
    const authResult = await verifyMobileAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const deliveryPersonId = authResult.user.id;

    const tokens = await prisma.deliveryPersonPushToken.findMany({
      where: {
        deliveryPersonId,
        isActive: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      data: { tokens },
    });
  } catch (error) {
    console.error('❌ Erreur récupération tokens FCM:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erreur lors de la récupération des tokens',
      },
      { status: 500 }
    );
  }
}
