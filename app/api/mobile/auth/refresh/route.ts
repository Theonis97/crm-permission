import { NextRequest, NextResponse } from 'next/server';
import { generateAccessToken, verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Refresh token requis' 
        },
        { status: 400 }
      );
    }

    // Vérifier le refresh token
    const payload = verifyToken(refreshToken);

    if (!payload || payload.type !== 'refresh') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Refresh token invalide ou expiré' 
        },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur existe toujours et est actif
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Utilisateur non trouvé ou désactivé' 
        },
        { status: 401 }
      );
    }

    // Générer un nouveau access token
    const roles = user.userRoles.map(ur => ur.role.name);
    
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      roles,
    });

    console.log(`🔄 Token refreshed for user: ${user.email}`);

    return NextResponse.json({
      success: true,
      data: {
        accessToken: newAccessToken,
      },
    });
  } catch (error) {
    console.error('❌ Token refresh error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors du rafraîchissement du token' 
      },
      { status: 500 }
    );
  }
}
