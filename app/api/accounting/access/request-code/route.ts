import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { createTransporter } from "@/lib/email-service"

const ACCOUNTING_ACCESS_EMAIL = "gabinmoundziegou@gmail.com"

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST /api/accounting/access/request-code - Demander un code d'accès
export async function POST() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const userId = session.user.id
    const userEmail = session.user.email
    const userName = session.user.name || userEmail

    // Invalider tous les codes précédents non utilisés
    await prisma.accountingAccessCode.updateMany({
      where: {
        userId,
        isUsed: false,
      },
      data: {
        isUsed: true,
      },
    })

    // Générer un nouveau code
    const code = generateCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // Expire dans 10 minutes

    // Sauvegarder le code
    await prisma.accountingAccessCode.create({
      data: {
        userId,
        code,
        expiresAt,
      },
    })

    // Envoyer l'email
    const transporter = createTransporter()
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: ACCOUNTING_ACCESS_EMAIL,
      subject: `🔐 Code d'accès Comptabilité - ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .header { background: #2563eb; padding: 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 24px; }
            .content { padding: 30px; text-align: center; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1f2937; background: #f3f4f6; padding: 20px 30px; border-radius: 8px; display: inline-block; margin: 20px 0; }
            .info { color: #6b7280; font-size: 14px; margin-top: 20px; }
            .user-info { background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .user-info p { margin: 5px 0; color: #92400e; }
            .warning { color: #dc2626; font-size: 12px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Accès Comptabilité</h1>
            </div>
            <div class="content">
              <div class="user-info">
                <p><strong>Utilisateur:</strong> ${userName}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              </div>
              
              <p>Voici le code d'accès à l'espace comptabilité:</p>
              
              <div class="code">${code}</div>
              
              <p class="info">Ce code est valide pendant <strong>10 minutes</strong>.</p>
              <p class="warning">⚠️ Ne partagez jamais ce code. Si vous n'avez pas demandé cet accès, ignorez cet email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    console.log(`📧 Code d'accès comptabilité envoyé à ${ACCOUNTING_ACCESS_EMAIL} pour l'utilisateur ${userName}`)

    return NextResponse.json({
      success: true,
      message: "Code envoyé par email",
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    console.error("[ACCOUNTING_ACCESS_REQUEST_CODE]", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du code" },
      { status: 500 }
    )
  }
}
