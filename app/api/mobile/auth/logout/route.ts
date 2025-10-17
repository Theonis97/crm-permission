import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    // Récupérer le token du header
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        console.log(`👋 User logged out: ${payload.email}`);
      }
    }

    // Dans une implémentation complète, on pourrait:
    // 1. Ajouter le token à une blacklist dans Redis
    // 2. Logger l'événement de déconnexion
    // 3. Invalider les sessions actives

    return NextResponse.json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la déconnexion' 
      },
      { status: 500 }
    );
  }
}
