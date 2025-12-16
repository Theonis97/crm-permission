import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Configuration du transporteur email
export const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER;
  
  console.log(`📧 Configuration SMTP: host=${host}, port=${port}, secure=${port === 465}, user=${user}`);
  
  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true pour 465 (SSL), false pour 587 (TLS)
    auth: {
      user: user,
      pass: process.env.SMTP_PASSWORD,
    },
    // Timeout plus long pour éviter les erreurs de connexion
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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

// Destinataires des emails de ventes POS
const POS_SALES_EMAIL_RECIPIENTS = [
  'intechgabon241@gmail.com',
  'asselidas50@gmail.com'
];

/**
 * Formate un montant en FCFA
 */
function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount) + ' FCFA';
}

/**
 * Envoie un email de notification pour une nouvelle vente POS
 * Affiche uniquement les informations de la vente en cours
 * Objet : "Ventes du jour : 16 Déc 2025"
 */
export async function sendDailyPosSalesEmail(
  storeId: string,
  newSale: {
    number: string;
    customerName: string;
    customerPhone: string;
    subtotal?: number;
    totalDiscount?: number;
    total: number;
    items: Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
      total: number;
    }>;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer les informations du magasin
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, address: true, phone: true }
    });

    if (!store) {
      console.error('❌ Magasin non trouvé pour l\'envoi d\'email POS');
      return { success: false, error: 'Magasin non trouvé' };
    }

    // Formater la date pour l'objet (format court : 16 Déc 2025)
    const now = new Date();
    const dateShort = now.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const dateStr = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const timeStr = now.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Calculer le nombre d'articles
    const totalItems = newSale.items.reduce((sum, item) => sum + item.quantity, 0);

    const transporter = createTransporter();

    // Générer le HTML des articles avec remises
    const itemsHtml = newSale.items.map(item => {
      const hasDiscount = item.discount && item.discount > 0;
      const originalTotal = item.unitPrice * item.quantity;
      return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; text-align: left;">${item.name}</td>
        <td style="padding: 12px 8px; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: right;">${formatFCFA(item.unitPrice)}</td>
        <td style="padding: 12px 8px; text-align: right;">
          ${hasDiscount ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 12px;">${formatFCFA(originalTotal)}</span><br>` : ''}
          <span style="font-weight: bold; ${hasDiscount ? 'color: #10b981;' : ''}">${formatFCFA(item.total)}</span>
          ${hasDiscount ? `<br><span style="color: #ef4444; font-size: 11px;">-${formatFCFA(item.discount!)}</span>` : ''}
        </td>
      </tr>
    `}).join('');

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'ERP-CRM'} - POS" <${process.env.SMTP_USER}>`,
      to: POS_SALES_EMAIL_RECIPIENTS.join(', '),
      subject: `Ventes du jour : ${dateShort}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div style="background: #10b981; color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🛒 Nouvelle Vente POS</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${newSale.number}</p>
            </div>

            <!-- Infos magasin et date -->
            <div style="background: white; padding: 20px; border-bottom: 1px solid #e5e7eb;">
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Magasin :</td>
                  <td style="padding: 5px 0; text-align: right; font-weight: bold;">${store.name}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Date :</td>
                  <td style="padding: 5px 0; text-align: right;">${dateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Heure :</td>
                  <td style="padding: 5px 0; text-align: right;">${timeStr}</td>
                </tr>
              </table>
            </div>

            <!-- Infos client -->
            <div style="background: #f9fafb; padding: 15px 20px; border-bottom: 1px solid #e5e7eb;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 10px;">Client</div>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 3px 0; color: #6b7280;">Nom :</td>
                  <td style="padding: 3px 0; text-align: right;">${newSale.customerName || 'Client anonyme'}</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0; color: #6b7280;">Téléphone :</td>
                  <td style="padding: 3px 0; text-align: right;">${newSale.customerPhone || 'N/A'}</td>
                </tr>
              </table>
            </div>

            <!-- Articles -->
            <div style="background: white; padding: 20px;">
              <div style="font-weight: bold; color: #374151; margin-bottom: 15px;">Articles (${totalItems})</div>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 10px 8px; text-align: left; font-weight: 600;">Produit</th>
                    <th style="padding: 10px 8px; text-align: center; font-weight: 600;">Qté</th>
                    <th style="padding: 10px 8px; text-align: right; font-weight: 600;">Prix unit.</th>
                    <th style="padding: 10px 8px; text-align: right; font-weight: 600;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </div>

            <!-- Récapitulatif avec remises -->
            <div style="background: #f9fafb; padding: 20px; border-top: 1px solid #e5e7eb;">
              <table style="width: 100%; font-size: 14px;">
                ${newSale.subtotal ? `
                <tr>
                  <td style="padding: 5px 0; color: #6b7280;">Sous-total :</td>
                  <td style="padding: 5px 0; text-align: right;">${formatFCFA(newSale.subtotal)}</td>
                </tr>
                ` : ''}
                ${newSale.totalDiscount && newSale.totalDiscount > 0 ? `
                <tr>
                  <td style="padding: 5px 0; color: #ef4444; font-weight: 600;">Remise totale :</td>
                  <td style="padding: 5px 0; text-align: right; color: #ef4444; font-weight: 600;">-${formatFCFA(newSale.totalDiscount)}</td>
                </tr>
                ` : ''}
              </table>
            </div>

            <!-- Total -->
            <div style="background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
              <div style="font-size: 14px; opacity: 0.9;">TOTAL À PAYER</div>
              <div style="font-size: 28px; font-weight: bold;">${formatFCFA(newSale.total)}</div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
              <p>Cet email a été envoyé automatiquement par le système ERP-CRM.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
NOUVELLE VENTE POS - ${newSale.number}
======================================

Magasin : ${store.name}
Date : ${dateStr}
Heure : ${timeStr}

CLIENT
------
Nom : ${newSale.customerName || 'Client anonyme'}
Téléphone : ${newSale.customerPhone || 'N/A'}

ARTICLES
--------
${newSale.items.map(item => `- ${item.name} x${item.quantity} @ ${formatFCFA(item.unitPrice)} = ${formatFCFA(item.total)}`).join('\n')}

${newSale.subtotal ? `Sous-total : ${formatFCFA(newSale.subtotal)}\n` : ''}${newSale.totalDiscount && newSale.totalDiscount > 0 ? `Remise : -${formatFCFA(newSale.totalDiscount)}\n` : ''}TOTAL : ${formatFCFA(newSale.total)}

---
Cet email a été envoyé automatiquement par le système ERP-CRM.
      `
    };

    console.log(`📧 Tentative d'envoi d'email POS à: ${POS_SALES_EMAIL_RECIPIENTS.join(', ')}`);
    console.log(`📧 Sujet: ${mailOptions.subject}`);
    
    // Vérifier la connexion SMTP avant d'envoyer
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée avec succès');
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email de vente POS envoyé avec succès!`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Réponse: ${info.response}`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi de l\'email POS:', error);
    console.error('❌ Code erreur:', error.code);
    console.error('❌ Message:', error.message);
    return { 
      success: false, 
      error: `Erreur SMTP: ${error.message || 'Erreur inconnue'}` 
    };
  }
}

/**
 * Envoie un email récapitulatif de clôture de journée
 * Appelé lors de la clôture de caisse par un utilisateur
 */
export async function sendDayClosureEmail(
  storeId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Récupérer les informations du magasin
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true, address: true, phone: true }
    });

    if (!store) {
      console.error('❌ Magasin non trouvé pour l\'envoi d\'email de clôture');
      return { success: false, error: 'Magasin non trouvé' };
    }

    // Récupérer l'utilisateur qui clôture
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true }
    });

    if (!user) {
      console.error('❌ Utilisateur non trouvé pour l\'envoi d\'email de clôture');
      return { success: false, error: 'Utilisateur non trouvé' };
    }

    // Récupérer TOUTES les ventes POS du jour pour cet utilisateur
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailySales = await prisma.storeOrder.findMany({
      where: {
        storeId,
        orderSource: 'POS',
        createdById: userId,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, sku: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Formater la date
    const dateShort = today.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    const dateStr = today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculer les totaux de la journée
    const dailyTotalSales = dailySales.length;
    const dailyTotalRevenue = dailySales.reduce((sum, sale) => sum + sale.total, 0);
    const dailyTotalDiscount = dailySales.reduce((sum, sale) => sum + (sale.totalDiscount || 0), 0);
    const dailyTotalItems = dailySales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );

    const transporter = createTransporter();

    // Générer le HTML pour chaque vente du jour
    const salesHtml = dailySales.map((sale, index) => {
      const saleTime = new Date(sale.createdAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const itemsHtml = sale.items.map(item => {
        const hasDiscount = item.discount && item.discount > 0;
        const originalTotal = item.unitPrice * item.quantity;
        return `
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 6px; text-align: left; font-size: 13px;">${item.name}</td>
            <td style="padding: 8px 6px; text-align: center; font-size: 13px;">${item.quantity}</td>
            <td style="padding: 8px 6px; text-align: right; font-size: 13px;">${formatFCFA(item.unitPrice)}</td>
            <td style="padding: 8px 6px; text-align: right; font-size: 13px;">
              ${hasDiscount ? `<span style="text-decoration: line-through; color: #9ca3af; font-size: 11px;">${formatFCFA(originalTotal)}</span> ` : ''}
              <span style="font-weight: bold; ${hasDiscount ? 'color: #10b981;' : ''}">${formatFCFA(item.total)}</span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <!-- Vente ${index + 1} -->
        <div style="background: white; margin-bottom: 15px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- En-tête de la vente -->
          <div style="background: #f3f4f6; padding: 12px 15px; border-bottom: 1px solid #e5e7eb;">
            <table style="width: 100%;">
              <tr>
                <td style="font-weight: bold; color: #374151;">${sale.number}</td>
                <td style="text-align: right; color: #6b7280; font-size: 13px;">${saleTime}</td>
              </tr>
              <tr>
                <td style="color: #6b7280; font-size: 13px;">Client: ${sale.customerName || 'Anonyme'}</td>
                <td style="text-align: right; color: #6b7280; font-size: 13px;">${sale.customerPhone || ''}</td>
              </tr>
            </table>
          </div>
          
          <!-- Articles -->
          <div style="padding: 10px 15px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: #f9fafb;">
                  <th style="padding: 6px; text-align: left; font-weight: 600; font-size: 12px;">Produit</th>
                  <th style="padding: 6px; text-align: center; font-weight: 600; font-size: 12px;">Qté</th>
                  <th style="padding: 6px; text-align: right; font-weight: 600; font-size: 12px;">P.U.</th>
                  <th style="padding: 6px; text-align: right; font-weight: 600; font-size: 12px;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          
          <!-- Total de la vente -->
          <div style="background: #f9fafb; padding: 10px 15px; border-top: 1px solid #e5e7eb;">
            <table style="width: 100%; font-size: 13px;">
              ${sale.totalDiscount && sale.totalDiscount > 0 ? `
              <tr>
                <td style="color: #ef4444;">Remise :</td>
                <td style="text-align: right; color: #ef4444; font-weight: 600;">-${formatFCFA(sale.totalDiscount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="font-weight: bold; color: #374151;">Total :</td>
                <td style="text-align: right; font-weight: bold; color: #10b981; font-size: 16px;">${formatFCFA(sale.total)}</td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }).join('');

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'ERP-CRM'} - Clôture" <${process.env.SMTP_USER}>`,
      to: POS_SALES_EMAIL_RECIPIENTS.join(', '),
      subject: `📊 Clôture de journée : ${dateShort} - ${store.name} - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
            .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Header -->
            <div style="background: #3b82f6; color: white; padding: 25px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 22px;">📊 Clôture de Journée</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${dateStr}</p>
            </div>

            <!-- Infos utilisateur -->
            <div style="background: #eff6ff; padding: 15px 20px; border-bottom: 1px solid #bfdbfe;">
              <table style="width: 100%;">
                <tr>
                  <td style="color: #3b82f6; font-weight: 600;">Clôturé par :</td>
                  <td style="text-align: right; font-weight: bold;">${userName}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Magasin :</td>
                  <td style="text-align: right; font-weight: bold;">${store.name}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280;">Heure de clôture :</td>
                  <td style="text-align: right;">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              </table>
            </div>

            <!-- Statistiques du jour -->
            <div style="background: white; padding: 20px; border-bottom: 2px solid #3b82f6;">
              <h2 style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">Récapitulatif de la journée</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Nombre de ventes :</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #3b82f6;">${dailyTotalSales}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Articles vendus :</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold;">${dailyTotalItems}</td>
                </tr>
                ${dailyTotalDiscount > 0 ? `
                <tr>
                  <td style="padding: 8px 0; color: #ef4444;">Remises accordées :</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #ef4444;">-${formatFCFA(dailyTotalDiscount)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 12px 0; font-weight: bold; font-size: 16px;">CHIFFRE D'AFFAIRES :</td>
                  <td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 24px; color: #10b981;">${formatFCFA(dailyTotalRevenue)}</td>
                </tr>
              </table>
            </div>

            <!-- Détail des ventes -->
            <div style="padding: 20px 0;">
              <h2 style="color: #374151; font-size: 16px; margin: 0 0 15px 0;">Détail des ventes (${dailyTotalSales})</h2>
              ${dailyTotalSales > 0 ? salesHtml : '<p style="color: #6b7280; text-align: center;">Aucune vente pour cette journée</p>'}
            </div>

            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb;">
              <p>Email de clôture de journée généré automatiquement.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
CLÔTURE DE JOURNÉE
==================

Clôturé par : ${userName}
Magasin : ${store.name}
Date : ${dateStr}
Heure de clôture : ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}

RÉCAPITULATIF
-------------
Nombre de ventes : ${dailyTotalSales}
Articles vendus : ${dailyTotalItems}
${dailyTotalDiscount > 0 ? `Remises accordées : -${formatFCFA(dailyTotalDiscount)}\n` : ''}
CHIFFRE D'AFFAIRES : ${formatFCFA(dailyTotalRevenue)}

DÉTAIL DES VENTES
-----------------
${dailySales.length > 0 ? dailySales.map((sale, i) => {
  const saleTime = new Date(sale.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `
${i + 1}. ${sale.number} (${saleTime})
   Client: ${sale.customerName || 'Anonyme'} - ${sale.customerPhone || 'N/A'}
   Articles:
${sale.items.map(item => `   - ${item.name} x${item.quantity} = ${formatFCFA(item.total)}`).join('\n')}
   ${sale.totalDiscount && sale.totalDiscount > 0 ? `Remise: -${formatFCFA(sale.totalDiscount)}\n   ` : ''}Total: ${formatFCFA(sale.total)}
`;
}).join('\n') : 'Aucune vente pour cette journée'}

---
Email de clôture de journée généré automatiquement.
      `
    };

    console.log(`📧 Tentative d'envoi d'email de clôture à: ${POS_SALES_EMAIL_RECIPIENTS.join(', ')}`);
    console.log(`📧 Sujet: ${mailOptions.subject}`);
    console.log(`📧 Nombre de ventes du jour: ${dailyTotalSales}`);
    
    // Vérifier la connexion SMTP avant d'envoyer
    await transporter.verify();
    console.log('✅ Connexion SMTP vérifiée avec succès');
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email de clôture envoyé avec succès!`);
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log(`📧 Réponse: ${info.response}`);

    return { success: true };
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'envoi de l\'email de clôture:', error);
    console.error('❌ Code erreur:', error.code);
    console.error('❌ Message:', error.message);
    return { 
      success: false, 
      error: `Erreur SMTP: ${error.message || 'Erreur inconnue'}` 
    };
  }
}

