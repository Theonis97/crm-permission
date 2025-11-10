import { NextResponse } from 'next/server';
import { VAPID_KEYS } from '@/lib/pwa-push-notifications';

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        publicKey: VAPID_KEYS.publicKey
      }
    });
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la clé VAPID:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur interne du serveur' 
      },
      { status: 500 }
    );
  }
}
