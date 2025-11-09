import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * POST /api/mobile/notifications/[id]/read
 * Marque une notification spécifique comme lue
 */
export async function POST(
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

    console.log(`✅ Marquage notification ${id} comme lue pour livreur ${deliveryPerson.id}`);

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

    // Marquer comme lue
    const updated = await prisma.deliveryNotification.update({
      where: {
        id,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    console.log(`✅ Notification ${id} marquée comme lue`);

    return NextResponse.json({
      success: true,
      notification: {
        id: updated.id,
        title: updated.title,
        body: updated.body,
        type: updated.type.toLowerCase(),
        isRead: updated.isRead,
        timestamp: updated.createdAt,
        data: updated.data,
        readAt: updated.readAt,
      },
    });
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    return NextResponse.json(
      { error: 'Erreur lors du marquage de la notification' },
      { status: 500 }
    );
  }
}
