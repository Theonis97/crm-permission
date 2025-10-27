import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Configuration du transporteur email (Gmail SMTP)
export const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

/**
 * Génère un token de réinitialisation sécurisé
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Génère un code à 6 chiffres
 */
export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Demander la réinitialisation du mot de passe
 * Génère un code à 6 chiffres et envoie un email au livreur
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    // Trouver le livreur par email
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { email },
    });

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe
    if (!deliveryPerson) {
      return { success: true }; // On retourne success même si l'email n'existe pas
    }

    // Vérifier que le compte est actif
    if (!deliveryPerson.isActive) {
      return { success: false, error: 'Votre compte est désactivé. Contactez votre administrateur.' };
    }

    // Générer un code à 6 chiffres
    const resetCode = generateResetCode();
    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 10); // Expiration dans 10 minutes

    // Sauvegarder le code dans la base de données
    await prisma.deliveryPerson.update({
      where: { id: deliveryPerson.id },
      data: {
        resetPasswordCode: resetCode,
        resetPasswordCodeExpiry: codeExpiry,
      },
    });

    // Envoyer l'email avec le code
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'ERP-CRM'}" <${process.env.SMTP_USER}>`,
      to: deliveryPerson.email,
      subject: 'Code de réinitialisation de mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code { display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; background: white; border: 2px solid #667eea; border-radius: 10px; margin: 20px 0; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Code de réinitialisation</h1>
            </div>
            <div class="content">
              <p>Bonjour <strong>${deliveryPerson.name}</strong>,</p>
              
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte livreur ERP-CRM.</p>
              
              <div style="text-align: center;">
                <div style="margin: 30px 0;">
                  <p style="font-size: 18px; font-weight: bold; color: #11181C;">Votre code de réinitialisation :</p>
                  <div class="code">${resetCode}</div>
                </div>
              </div>
              
              <div class="warning">
                <strong>⚠️ Important :</strong>
                <ul>
                  <li>Ce code est valide pendant <strong>10 minutes</strong></li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                  <li>Ne partagez jamais ce code avec personne</li>
                </ul>
              </div>
              
              <div class="footer">
                <p>Cet email a été envoyé automatiquement par le système ERP-CRM.</p>
                <p>Pour toute question, contactez votre administrateur.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Code de réinitialisation de mot de passe
        
        Bonjour ${deliveryPerson.name},
        
        Vous avez demandé à réinitialiser votre mot de passe pour votre compte livreur ERP-CRM.
        
        Votre code de réinitialisation : ${resetCode}
        
        Ce code est valide pendant 10 minutes.
        
        IMPORTANT :
        - Ce code est valide pendant 10 minutes
        - Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
        - Ne partagez jamais ce code avec personne
        
        Cet email a été envoyé automatiquement par le système ERP-CRM.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Code de réinitialisation envoyé à:', deliveryPerson.email);

    return { success: true, code: resetCode };
  } catch (error) {
    console.error('❌ Erreur lors de la demande de réinitialisation:', error);
    return { 
      success: false, 
      error: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer plus tard.' 
    };
  }
}

/**
 * Réinitialiser le mot de passe avec le token
 */
export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Trouver le livreur avec le token valide
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordTokenExpiry: {
          gt: new Date(), // Le token doit être encore valide
        },
      },
    });

    if (!deliveryPerson) {
      return { 
        success: false, 
        error: 'Token invalide ou expiré. Veuillez demander un nouveau lien de réinitialisation.' 
      };
    }

    // Vérifier que le compte est actif
    if (!deliveryPerson.isActive) {
      return { success: false, error: 'Votre compte est désactivé. Contactez votre administrateur.' };
    }

    // Hasher le nouveau mot de passe
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et effacer le token
    await prisma.deliveryPerson.update({
      where: { id: deliveryPerson.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null,
      },
    });

    console.log('✅ Mot de passe réinitialisé pour:', deliveryPerson.email);

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    return { 
      success: false, 
      error: 'Erreur lors de la réinitialisation du mot de passe.' 
    };
  }
}

/**
 * Vérifier si un code de réinitialisation est valide
 */
export async function verifyResetCode(email: string, code: string): Promise<{ success: boolean; error?: string; userId?: string }> {
  try {
    // Trouver le livreur par email
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { email },
    });

    if (!deliveryPerson) {
      return { success: false, error: 'Code invalide ou expiré' };
    }

    if (!deliveryPerson.isActive) {
      return { success: false, error: 'Votre compte est désactivé' };
    }

    // Vérifier le code
    if (!deliveryPerson.resetPasswordCode || !deliveryPerson.resetPasswordCodeExpiry) {
      return { success: false, error: 'Aucun code de réinitialisation trouvé' };
    }

    if (deliveryPerson.resetPasswordCode !== code) {
      return { success: false, error: 'Code incorrect' };
    }

    if (new Date() > deliveryPerson.resetPasswordCodeExpiry) {
      return { success: false, error: 'Code expiré' };
    }

    console.log('✅ Code de réinitialisation vérifié pour:', deliveryPerson.email);
    return { success: true, userId: deliveryPerson.id };
  } catch (error) {
    console.error('❌ Erreur lors de la vérification du code:', error);
    return { success: false, error: 'Erreur lors de la vérification du code' };
  }
}

/**
 * Réinitialiser le mot de passe avec le code vérifié
 */
export async function resetPasswordWithCode(email: string, code: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier d'abord le code
    const verification = await verifyResetCode(email, code);
    
    if (!verification.success) {
      return verification;
    }

    // Hasher le nouveau mot de passe
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe et effacer le code
    await prisma.deliveryPerson.update({
      where: { id: verification.userId },
      data: {
        password: hashedPassword,
        resetPasswordCode: null,
        resetPasswordCodeExpiry: null,
      },
    });

    console.log('✅ Mot de passe réinitialisé pour:', email);

    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error);
    return { 
      success: false, 
      error: 'Erreur lors de la réinitialisation du mot de passe.' 
    };
  }
}

