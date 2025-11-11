import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [AUTH_ME] Début de la vérification d\'authentification');
    
    // Récupérer le token du header Authorization
    const authHeader = request.headers.get('authorization');
    console.log('📡 [AUTH_ME] Header Authorization:', authHeader ? `${authHeader.substring(0, 20)}...` : 'MANQUANT');
    
    const token = extractTokenFromHeader(authHeader);
    console.log('🔑 [AUTH_ME] Token extrait:', token ? `${token.substring(0, 20)}...` : 'NULL');

    if (!token) {
      console.log('❌ [AUTH_ME] ÉCHEC: Token manquant');
      return NextResponse.json(
        { 
          success: false,
          error: 'Token d\'authentification manquant' 
        },
        { status: 401 }
      );
    }

    // Vérifier le token
    console.log('🔐 [AUTH_ME] Vérification du token...');
    const payload = verifyToken(token);
    console.log('📋 [AUTH_ME] Payload décodé:', payload ? { userId: payload.userId, type: payload.type, exp: payload.exp } : 'NULL');

    if (!payload || payload.type !== 'access') {
      console.log('❌ [AUTH_ME] ÉCHEC: Token invalide ou mauvais type');
      console.log('   - Payload exists:', !!payload);
      console.log('   - Payload type:', payload?.type);
      return NextResponse.json(
        { 
          success: false,
          error: 'Token invalide ou expiré' 
        },
        { status: 401 }
      );
    }

    // Récupérer les informations complètes du livreur
    console.log('👤 [AUTH_ME] Recherche du livreur avec ID:', payload.userId);
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
      console.log('❌ [AUTH_ME] ÉCHEC: Livreur non trouvé en base de données');
      return NextResponse.json(
        { 
          success: false,
          error: 'Livreur non trouvé' 
        },
        { status: 404 }
      );
    }

    console.log('✅ [AUTH_ME] Livreur trouvé:', {
      id: deliveryPerson.id,
      name: deliveryPerson.name,
      email: deliveryPerson.email,
      isActive: deliveryPerson.isActive
    });

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
    console.log('✅ [AUTH_ME] SUCCÈS: Authentification réussie pour', deliveryPerson.name);
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
