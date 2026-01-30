import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/payroll/rubrics/[id]/employees - Liste des employés ayant cette rubrique
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const employeeRubrics = await prisma.employeeRubric.findMany({
      where: { rubricId: id },
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
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(employeeRubrics)
  } catch (error) {
    console.error("[PAYROLL_RUBRIC_EMPLOYEES_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des assignations" },
      { status: 500 }
    )
  }
}

// POST /api/payroll/rubrics/[id]/employees - Assigner une rubrique à un employé
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id: rubricId } = await params
    const body = await request.json()
    const { employeeProfileId, amount, rate, startDate, endDate, notes } = body

    if (!employeeProfileId) {
      return NextResponse.json(
        { error: "L'ID du profil employé est requis" },
        { status: 400 }
      )
    }

    // Vérifier que la rubrique existe
    const rubric = await prisma.payrollRubric.findUnique({
      where: { id: rubricId },
    })

    if (!rubric) {
      return NextResponse.json(
        { error: "Rubrique non trouvée" },
        { status: 404 }
      )
    }

    // Vérifier que le profil employé existe
    const employeeProfile = await prisma.employeePayrollProfile.findUnique({
      where: { id: employeeProfileId },
    })

    if (!employeeProfile) {
      return NextResponse.json(
        { error: "Profil employé non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si l'assignation existe déjà
    const existingAssignment = await prisma.employeeRubric.findUnique({
      where: {
        employeeProfileId_rubricId: {
          employeeProfileId,
          rubricId,
        },
      },
    })

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Cette rubrique est déjà assignée à cet employé" },
        { status: 400 }
      )
    }

    const employeeRubric = await prisma.employeeRubric.create({
      data: {
        employeeProfileId,
        rubricId,
        amount: amount ?? rubric.defaultAmount,
        rate: rate ?? rubric.defaultRate,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        notes,
        createdById: session.user.id,
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

    console.log(
      `✅ Rubrique ${rubric.code} assignée à ${employeeRubric.employeeProfile.user.firstName} ${employeeRubric.employeeProfile.user.lastName}`
    )

    return NextResponse.json(employeeRubric, { status: 201 })
  } catch (error) {
    console.error("[PAYROLL_RUBRIC_EMPLOYEES_POST]", error)
    return NextResponse.json(
      { error: "Erreur lors de l'assignation de la rubrique" },
      { status: 500 }
    )
  }
}
