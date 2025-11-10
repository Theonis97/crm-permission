import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyMobileAuth } from '@/lib/auth-mobile';

/**
 * GET /api/mobile/notifications
 * Récupère toutes les notifications du livreur connecté
 */
export async function GET(request: NextRequest) {
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
    console.log(`📬 Récupération notifications pour livreur ${deliveryPerson.id}`);

    // Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const onlyUnread = searchParams.get('onlyUnread') === 'true';

    // Construire la requête
    const where: any = {
      deliveryPersonId: deliveryPerson.id,
    };

    if (onlyUnread) {
      where.isRead = false;
    }

    // Récupérer les notifications
    const notifications = await prisma.deliveryNotification.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Compter les non lues
    const unreadCount = await prisma.deliveryNotification.count({
      where: {
        deliveryPersonId: deliveryPerson.id,
        isRead: false,
      },
    });

    console.log(`✅ ${notifications.length} notifications récupérées (${unreadCount} non lues)`);

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications.map((n:any) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          type: n.type.toLowerCase(), // order, system, info
          isRead: n.isRead,
          timestamp: n.createdAt,
          data: n.data,
          readAt: n.readAt,
        })),
        unreadCount,
      },
    });
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des notifications' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/mobile/notifications
 * Efface toutes les notifications du livreur connecté
 */
export async function DELETE(request: NextRequest) {
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
    console.log(`🗑️ Suppression de toutes les notifications pour livreur ${deliveryPerson.id}`);

    // Supprimer toutes les notifications du livreur
    const result = await prisma.deliveryNotification.deleteMany({
      where: {
        deliveryPersonId: deliveryPerson.id,
      },
    });

    console.log(`✅ ${result.count} notifications supprimées`);

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.count,
      },
    });
  } catch (error) {
    console.error('❌ Erreur suppression notifications:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des notifications' },
      { status: 500 }
    );
  }
}
