import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mobile/day-shift-status
 * Vérifier si la journée est déjà clôturée
 */
export async function GET(request: NextRequest) {
  try {
    // Authentifier l'utilisateur
    const { user, error } = await authenticateMobileUser(request);

    if (error || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: error || 'Non authentifié' 
        },
        { status: 401 }
      );
    }

    // Date du jour (8h-19h)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(8, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(19, 0, 0, 0);

    // Vérifier si la journée a déjà été clôturée
    const existingShift = await prisma.dayShift.findFirst({
      where: {
        deliveryPersonId: user.id,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (existingShift) {
      return NextResponse.json({
        success: true,
        isClosed: true,
        data: {
          date: existingShift.date,
          commission: existingShift.commission,
          totalOrders: existingShift.totalOrders,
          deliveredOrders: existingShift.deliveredOrders,
          cancelledOrders: existingShift.cancelledOrders,
          reportedOrders: existingShift.reportedOrders,
        },
      });
    }

    return NextResponse.json({
      success: true,
      isClosed: false,
    });
  } catch (error: any) {
    console.error('❌ Erreur vérification statut journée:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la vérification du statut de la journée' 
      },
      { status: 500 }
    );
  }
}

