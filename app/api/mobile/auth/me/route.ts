import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Récupérer le token du header Authorization
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token d\'authentification manquant' 
        },
        { status: 401 }
      );
    }

    // Vérifier le token
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'access') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Token invalide ou expiré' 
        },
        { status: 401 }
      );
    }

    // Récupérer les informations complètes du livreur
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: payload.userId },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!deliveryPerson) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Livreur non trouvé' 
        },
        { status: 404 }
      );
    }

    if (!deliveryPerson.isActive) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Compte désactivé' 
        },
        { status: 403 }
      );
    }

    // Retourner les informations du livreur (sans le mot de passe)
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: deliveryPerson.id,
          email: deliveryPerson.email,
          phone: deliveryPerson.phone,
          name: deliveryPerson.name,
          firstName: null,
          lastName: null,
          avatar: deliveryPerson.avatar,
          storeId: deliveryPerson.storeId,
          storeName: deliveryPerson.store.name,
          vehicle: deliveryPerson.vehicle,
          plateNumber: deliveryPerson.plateNumber,
          status: deliveryPerson.status,
          rating: deliveryPerson.rating,
          totalDeliveries: deliveryPerson.totalDeliveries,
          isActive: deliveryPerson.isActive,
          roles: ['driver'],
          createdAt: deliveryPerson.createdAt,
          updatedAt: deliveryPerson.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('❌ Get user info error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la récupération des informations' 
      },
      { status: 500 }
    );
  }
}
