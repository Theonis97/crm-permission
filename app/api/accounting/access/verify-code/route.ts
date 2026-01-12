import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// POST /api/accounting/access/verify-code - Vérifier un code d'accès
export async function POST(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const userId = session.user.id
    const body = await request.json()
    const { code } = body

    if (!code || code.length !== 6) {
      return NextResponse.json(
        { error: "Code invalide" },
        { status: 400 }
      )
    }

    // Chercher le code valide
    const accessCode = await prisma.accountingAccessCode.findFirst({
      where: {
        userId,
        code,
        isUsed: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (!accessCode) {
      return NextResponse.json(
        { error: "Code invalide ou expiré" },
        { status: 401 }
      )
    }

    // Marquer le code comme utilisé
    await prisma.accountingAccessCode.update({
      where: { id: accessCode.id },
      data: { isUsed: true },
    })

    console.log(`✅ Accès comptabilité validé pour l'utilisateur ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Accès autorisé",
    })
  } catch (error) {
    console.error("[ACCOUNTING_ACCESS_VERIFY_CODE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
