import { NextRequest, NextResponse } from 'next/server';
import { verifyResetCode } from '@/lib/email-service';

/**
 * POST /api/mobile/auth/verify-code
 * Vérifier si un code de réinitialisation est valide
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    // Validation
    if (!email || !code) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email et code requis' 
        },
        { status: 400 }
      );
    }

    // Vérifier le code
    const result = await verifyResetCode(email, code);

    return NextResponse.json({
      success: result.success,
      error: result.error
    });
  } catch (error) {
    console.error('❌ Erreur verification code:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la vérification du code' 
      },
      { status: 500 }
    );
  }
}

