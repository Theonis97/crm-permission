import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// POST - Approuver un bulletin de paie (Direction)
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
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Bulletin non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier le statut
    if (existing.status !== "VALIDATED") {
      return NextResponse.json(
        { error: "Ce bulletin doit d'abord être validé par RH avant approbation" },
        { status: 400 }
      )
    }

    // Mettre à jour le bulletin
    const payroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById: session?.user?.id,
        approvedAt: new Date(),
        approvalNotes: notes || null,
      },
    })

    // Créer l'entrée d'audit
    await prisma.payrollAuditLog.create({
      data: {
        payrollId: id,
        userId: session?.user?.id || "",
        action: "APPROVE",
        comment: notes || `Bulletin approuvé par la direction`,
      },
    })

    return NextResponse.json({
      success: true,
      message: `Bulletin ${payroll.number} approuvé avec succès`,
      payroll,
    })
  } catch (error) {
    console.error("Error approving payroll:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'approbation du bulletin" },
      { status: 500 }
    )
  }
}
