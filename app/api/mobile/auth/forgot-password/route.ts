import { NextRequest, NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/email-service';

/**
 * POST /api/mobile/auth/forgot-password
 * Demander la réinitialisation du mot de passe
 * Envoie un email avec un code à 6 chiffres
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validation
    if (!email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email requis' 
        },
        { status: 400 }
      );
    }

    // Demander la réinitialisation
    const result = await requestPasswordReset(email);

    if (result.success) {
      // Pour des raisons de sécurité, on ne révèle pas si l'email existe
      return NextResponse.json({
        success: true,
        message: 'Si cette adresse email existe, vous recevrez un code de réinitialisation par email.'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erreur lors de la demande de réinitialisation'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Erreur forgot-password:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la demande de réinitialisation' 
      },
      { status: 500 }
    );
  }
}

