import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer une cotisation spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const contribution = await prisma.payrollContribution.findUnique({
      where: { id },
    })

    if (!contribution) {
      return NextResponse.json(
        { error: "Cotisation non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(contribution)
  } catch (error) {
    console.error("Error fetching payroll contribution:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la cotisation" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour une cotisation
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()

    const {
      name,
      code,
      description,
      isEmployeeShare,
      isEmployerShare,
      rate,
      ceiling,
      declaredOnly,
      displayOrder,
      isActive,
    } = body

    // Vérifier que la cotisation existe
    const existing = await prisma.payrollContribution.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Cotisation non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier l'unicité du nom et du code si modifiés
    if (name && name !== existing.name) {
      const nameExists = await prisma.payrollContribution.findFirst({
        where: { name, id: { not: id } },
      })
      if (nameExists) {
        return NextResponse.json(
          { error: "Une cotisation avec ce nom existe déjà" },
          { status: 409 }
        )
      }
    }

    if (code && code !== existing.code) {
      const codeExists = await prisma.payrollContribution.findFirst({
        where: { code, id: { not: id } },
      })
      if (codeExists) {
        return NextResponse.json(
          { error: "Une cotisation avec ce code existe déjà" },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (description !== undefined) updateData.description = description
    if (isEmployeeShare !== undefined) updateData.isEmployeeShare = isEmployeeShare
    if (isEmployerShare !== undefined) updateData.isEmployerShare = isEmployerShare
    if (rate !== undefined) updateData.rate = rate
    if (ceiling !== undefined) updateData.ceiling = ceiling
    if (declaredOnly !== undefined) updateData.declaredOnly = declaredOnly
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder
    if (isActive !== undefined) updateData.isActive = isActive

    const contribution = await prisma.payrollContribution.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(contribution)
  } catch (error) {
    console.error("Error updating payroll contribution:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la cotisation" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une cotisation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que la cotisation existe
    const existing = await prisma.payrollContribution.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payrollLines: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Cotisation non trouvée" },
        { status: 404 }
      )
    }

    // Empêcher la suppression si utilisée dans des bulletins
    if (existing._count.payrollLines > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer une cotisation utilisée dans des bulletins. Désactivez-la plutôt." },
        { status: 400 }
      )
    }

    await prisma.payrollContribution.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Cotisation supprimée avec succès" })
  } catch (error) {
    console.error("Error deleting payroll contribution:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la cotisation" },
      { status: 500 }
    )
  }
}
