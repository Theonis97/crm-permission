import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/payroll/employee-rubrics/[id] - Détails d'une assignation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const employeeRubric = await prisma.employeeRubric.findUnique({
      where: { id },
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
        rubric: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!employeeRubric) {
      return NextResponse.json(
        { error: "Assignation non trouvée" },
        { status: 404 }
      )
    }

    return NextResponse.json(employeeRubric)
  } catch (error) {
    console.error("[EMPLOYEE_RUBRIC_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'assignation" },
      { status: 500 }
    )
  }
}

// PUT /api/payroll/employee-rubrics/[id] - Modifier une assignation
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { amount, rate, startDate, endDate, notes, isActive } = body

    const existingAssignment = await prisma.employeeRubric.findUnique({
      where: { id },
    })

    if (!existingAssignment) {
      return NextResponse.json(
        { error: "Assignation non trouvée" },
        { status: 404 }
      )
    }

    const employeeRubric = await prisma.employeeRubric.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(rate !== undefined && { rate }),
        ...(startDate !== undefined && {
          startDate: startDate ? new Date(startDate) : null,
        }),
        ...(endDate !== undefined && {
          endDate: endDate ? new Date(endDate) : null,
        }),
        ...(notes !== undefined && { notes }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        employeeProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        rubric: true,
      },
    })

    console.log(`✅ Assignation modifiée: ${employeeRubric.rubric.code}`)

    return NextResponse.json(employeeRubric)
  } catch (error) {
    console.error("[EMPLOYEE_RUBRIC_PUT]", error)
    return NextResponse.json(
      { error: "Erreur lors de la modification de l'assignation" },
      { status: 500 }
    )
  }
}

// DELETE /api/payroll/employee-rubrics/[id] - Supprimer une assignation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const employeeRubric = await prisma.employeeRubric.findUnique({
      where: { id },
      include: {
        rubric: true,
        employeeProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    })

    if (!employeeRubric) {
      return NextResponse.json(
        { error: "Assignation non trouvée" },
        { status: 404 }
      )
    }

    await prisma.employeeRubric.delete({
      where: { id },
    })

    console.log(
      `🗑️ Assignation supprimée: ${employeeRubric.rubric.code} pour ${employeeRubric.employeeProfile.user.firstName} ${employeeRubric.employeeProfile.user.lastName}`
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[EMPLOYEE_RUBRIC_DELETE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'assignation" },
      { status: 500 }
    )
  }
}
