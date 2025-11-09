import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * DELETE /api/mobile/notifications/[id]
 * Supprime une notification spécifique
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    console.log(`🗑️ Suppression notification ${id} pour livreur ${deliveryPerson.id}`);

    // Vérifier que la notification appartient au livreur
    const notification = await prisma.deliveryNotification.findFirst({
      where: {
        id,
        deliveryPersonId: deliveryPerson.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification non trouvée' },
        { status: 404 }
      );
    }

    // Supprimer la notification
    await prisma.deliveryNotification.delete({
      where: {
        id,
      },
    });

    console.log(`✅ Notification ${id} supprimée`);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression de la notification' },
      { status: 500 }
    );
  }
}
