import { NextRequest, NextResponse } from 'next/server';
import { authenticateMobileUser } from '@/lib/auth-mobile';
import { prisma } from '@/lib/prisma';
import { createTransporter } from '@/lib/email-service';

/**
 * POST /api/mobile/close-day-shift
 * Clôture la journée pour un livreur
 * Calcule les statistiques et envoie un email au gérant de la boutique
 */
export async function POST(request: NextRequest) {
  try {
    // Authentifier l'utilisateur
    const { user, error } = await authenticateMobileUser(request);

    if (error || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: error || 'Non authentifié' 
        },
        { status: 401 }
      );
    }

    // Date du jour (8h-19h)
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(8, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(19, 0, 0, 0);

    // Récupérer le livreur avec sa boutique
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: user.id },
      include: {
        store: {
          include: {
            manager: true, // Gérant de la boutique
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

    // Récupérer toutes les commandes du jour
    const dayOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: user.id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    // Calculer les statistiques
    const totalOrders = dayOrders.length;
    const deliveredOrders = dayOrders.filter(o => o.status === 'DELIVERED').length;
    const cancelledOrders = dayOrders.filter(o => o.status === 'CANCELLED').length;
    const reportedOrders = dayOrders.filter(o => o.status === 'REPORTED').length;

    // Calculer la commission totale
    const commission = dayOrders
      .filter(o => o.status === 'DELIVERED')
      .reduce((sum, order) => sum + (order.commission || 0), 0);

    // Vérifier si la journée a déjà été clôturée
    const existingShift = await prisma.dayShift.findFirst({
      where: {
        deliveryPersonId: user.id,
        date: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    if (existingShift) {
      return NextResponse.json(
        { 
          success: false,
          error: 'La journée a déjà été clôturée' 
        },
        { status: 400 }
      );
    }

    // Créer la clôture de journée
    const dayShift = await prisma.dayShift.create({
      data: {
        deliveryPersonId: user.id,
        date: now,
        commission,
        totalOrders,
        deliveredOrders,
        cancelledOrders,
        reportedOrders,
      },
    });

    // Envoyer l'email au gérant de la boutique
    if (deliveryPerson.store.manager?.email) {
      await sendDayReportEmail(
        deliveryPerson.store.manager,
        deliveryPerson,
        dayShift,
      );
    }

    console.log('✅ Journée clôturée pour:', deliveryPerson.name);

    return NextResponse.json({
      success: true,
      data: {
        date: dayShift.date,
        commission: dayShift.commission,
        totalOrders: dayShift.totalOrders,
        deliveredOrders: dayShift.deliveredOrders,
        cancelledOrders: dayShift.cancelledOrders,
        reportedOrders: dayShift.reportedOrders,
      },
    });
  } catch (error: any) {
    console.error('❌ Erreur clôture de journée:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erreur lors de la clôture de journée' 
      },
      { status: 500 }
    );
  }
}

/**
 * Envoyer un email de rapport de journée au gérant
 */
async function sendDayReportEmail(
  manager: any,
  deliveryPerson: any,
  dayShift: any,
) {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.APP_NAME || 'ERP-CRM'}" <${process.env.SMTP_USER}>`,
      to: manager.email,
      subject: `Rapport de journée - ${deliveryPerson.name}`,
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
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 20px; border-radius: 10px; text-align: center; border: 2px solid #e5e7eb; }
            .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
            .stat-label { font-size: 14px; color: #6b7280; margin-top: 5px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .success { color: #10b981; }
            .warning { color: #f59e0b; }
            .danger { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Rapport de journée</h1>
              <p>${deliveryPerson.name}</p>
            </div>
            <div class="content">
              <p>Bonjour <strong>${manager.firstName || manager.name}</strong>,</p>
              
              <p>Le livreur <strong>${deliveryPerson.name}</strong> a clôturé sa journée.</p>
              
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-value">${dayShift.totalOrders}</div>
                  <div class="stat-label">Total commandes</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value success">${dayShift.deliveredOrders}</div>
                  <div class="stat-label">Livrées</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value danger">${dayShift.cancelledOrders}</div>
                  <div class="stat-label">Annulées</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value warning">${dayShift.reportedOrders}</div>
                  <div class="stat-label">Reportées</div>
                </div>
              </div>

              <div style="background: white; padding: 20px; border-radius: 10px; margin-top: 20px; text-align: center;">
                <div style="font-size: 18px; color: #6b7280;">Commission totale</div>
                <div style="font-size: 36px; font-weight: bold; color: #667eea; margin-top: 10px;">
                  ${dayShift.commission.toFixed(2)} €
                </div>
              </div>
              
              <div class="footer">
                <p>Date de clôture : ${dayShift.date.toLocaleString('fr-FR')}</p>
                <p>Cet email a été envoyé automatiquement par le système ERP-CRM.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Rapport de journée - ${deliveryPerson.name}
        
        Bonjour ${manager.firstName || manager.name},
        
        Le livreur ${deliveryPerson.name} a clôturé sa journée.
        
        Statistiques :
        - Total commandes : ${dayShift.totalOrders}
        - Livrées : ${dayShift.deliveredOrders}
        - Annulées : ${dayShift.cancelledOrders}
        - Reportées : ${dayShift.reportedOrders}
        - Commission totale : ${dayShift.commission.toFixed(2)} €
        
        Date de clôture : ${dayShift.date.toLocaleString('fr-FR')}
        
        Cet email a été envoyé automatiquement par le système Inotech Delivery.
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('📧 Email de rapport envoyé à:', manager.email);
  } catch (error) {
    console.error('❌ Erreur envoi email rapport:', error);
  }
}

