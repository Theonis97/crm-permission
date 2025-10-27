import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordWithCode } from '@/lib/email-service';

/**
 * POST /api/mobile/auth/reset-password
 * Réinitialiser le mot de passe avec le code
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

    // Validation
    if (!email || !code || !newPassword) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Email, code et nouveau mot de passe requis' 
        },
        { status: 400 }
      );
    }

    // Vérifier la longueur du mot de passe
    if (newPassword.length < 6) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Le mot de passe doit contenir au moins 6 caractères' 
        },
        { status: 400 }
      );
    }

    // Réinitialiser le mot de passe avec le code
    const result = await resetPasswordWithCode(email, code, newPassword);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Votre mot de passe a été réinitialisé avec succès.'
      });
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: result.error || 'Erreur lors de la réinitialisation'
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Erreur reset-password:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la réinitialisation du mot de passe' 
      },
      { status: 500 }
    );
  }
}


