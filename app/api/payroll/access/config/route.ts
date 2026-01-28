import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession, hasAnyPermission } from "@/lib/auth-helpers"

const DEFAULT_PAYROLL_ACCESS_EMAIL = "gabinmoundziegou@gmail.com"

// GET /api/payroll/access/config - Récupérer la config
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const config = await prisma.moduleAccessConfig.findUnique({
      where: { module: "PAYROLL" },
      include: {
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, name: true }
        }
      }
    })

    return NextResponse.json({
      recipientEmail: config?.recipientEmail || DEFAULT_PAYROLL_ACCESS_EMAIL,
      isDefault: !config,
      updatedBy: config?.updatedBy || null,
      updatedAt: config?.updatedAt || null,
    })
  } catch (error) {
    console.error("[PAYROLL_ACCESS_CONFIG_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la configuration" },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/access/config - Modifier l'email de réception
export async function PUT(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    // Vérifier les permissions (plusieurs permissions autorisées)
    const canEdit = await hasAnyPermission(session.user.id, [
      "payroll.contributions.manage",
      "payroll.periods.manage",
      "payroll.profiles.manage",
      "admin",
    ])
    if (!canEdit) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { recipientEmail } = body

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      )
    }

    const config = await prisma.moduleAccessConfig.upsert({
      where: { module: "PAYROLL" },
      update: {
        recipientEmail,
        updatedById: session.user.id,
      },
      create: {
        module: "PAYROLL",
        recipientEmail,
        updatedById: session.user.id,
      },
    })

    return NextResponse.json({
      success: true,
      config,
    })
  } catch (error) {
    console.error("[PAYROLL_ACCESS_CONFIG_PUT]", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}
