import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// POST - Valider un bulletin de paie (RH)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { notes } = body

    // Vérifier que le bulletin existe
    const existing = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employeeProfile: {
          include: {
            user: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bulletin non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier le statut
    if (existing.status !== "DRAFT" && existing.status !== "PENDING") {
      return NextResponse.json(
        { error: "Ce bulletin ne peut pas être validé (statut actuel: " + existing.status + ")" },
        { status: 400 }
      )
    }

    // Mettre à jour le bulletin
    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: "VALIDATED",
        validatedById: session?.user?.id,
        validatedAt: new Date(),
        validationNotes: notes || null,
      },
    })

    // Créer l'entrée d'audit
    await prisma.payrollAuditLog.create({
      data: {
        payrollId: id,
        userId: session?.user?.id || "",
        action: "VALIDATE",
        comment: notes || `Bulletin validé par RH`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Bulletin ${payroll.number} validé avec succès`,
      payroll,
    })
  } catch (error) {
    console.error("Error validating payroll:", error)
    return NextResponse.json(
      { error: "Erreur lors de la validation du bulletin" },
      { status: 500 }
    )
  }
}
