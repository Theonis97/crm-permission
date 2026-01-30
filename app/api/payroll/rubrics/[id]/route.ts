import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/payroll/rubrics/[id] - Détails d'une rubrique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const rubric = await prisma.payrollRubric.findUnique({
      where: { id },
      include: {
        employeeRubrics: {
          include: {
            employeeProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    matricule: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            rubricLines: true,
          },
        },
      },
    })

    if (!rubric) {
      return NextResponse.json(
        { error: "Rubrique non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(rubric)
  } catch (error) {
    console.error("[PAYROLL_RUBRIC_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la rubrique" },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/rubrics/[id] - Modifier une rubrique
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()

    const {
      code,
      name,
      description,
      type,
      isSubjectToTax,
      isSubjectToSocial,
      calculationBase,
      defaultAmount,
      defaultRate,
      exemptionCeiling,
      displayOrder,
      category,
      isActive,
    } = body

    // Vérifier que la rubrique existe
    const existingRubric = await prisma.payrollRubric.findUnique({
      where: { id },
    })

    if (!existingRubric) {
      return NextResponse.json(
        { error: "Rubrique non trouvée" },
        { status: 404 }
      )
    }

    // Si le code change, vérifier l'unicité
    if (code && code !== existingRubric.code) {
      const codeExists = await prisma.payrollRubric.findUnique({
        where: { code },
      })
      if (codeExists) {
        return NextResponse.json(
          { error: "Ce code de rubrique existe déjà" },
          { status: 400 }
        )
      }
    }

    const rubric = await prisma.payrollRubric.update({
      where: { id },
      data: {
        ...(code && { code: code.toUpperCase() }),
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(isSubjectToTax !== undefined && { isSubjectToTax }),
        ...(isSubjectToSocial !== undefined && { isSubjectToSocial }),
        ...(calculationBase && { calculationBase }),
        ...(defaultAmount !== undefined && { defaultAmount }),
        ...(defaultRate !== undefined && { defaultRate }),
        ...(exemptionCeiling !== undefined && { exemptionCeiling }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(category !== undefined && { category }),
        ...(isActive !== undefined && { isActive }),
      },
    })

    console.log(`✅ Rubrique modifiée: ${rubric.code} - ${rubric.name}`)

    return NextResponse.json(rubric)
  } catch (error) {
    console.error("[PAYROLL_RUBRIC_PUT]", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification de la rubrique" },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll/rubrics/[id] - Supprimer une rubrique
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que la rubrique existe
    const rubric = await prisma.payrollRubric.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            rubricLines: true,
            employeeRubrics: true,
          },
        },
      },
    })

    if (!rubric) {
      return NextResponse.json(
        { error: "Rubrique non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier si la rubrique est utilisée dans des bulletins
    if (rubric._count.rubricLines > 0) {
      return NextResponse.json(
        {
          error: "Impossible de supprimer cette rubrique car elle est utilisée dans des bulletins de paie. Vous pouvez la désactiver à la place.",
        },
        { status: 400 }
      )
    }

    // Supprimer les assignations aux employés d'abord
    await prisma.employeeRubric.deleteMany({
      where: { rubricId: id },
    })

    // Supprimer la rubrique
    await prisma.payrollRubric.delete({
      where: { id },
    })

    console.log(`🗑️ Rubrique supprimée: ${rubric.code} - ${rubric.name}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PAYROLL_RUBRIC_DELETE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la rubrique" },
      { status: 500 }
    )
  }
}
