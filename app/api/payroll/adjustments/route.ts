import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Liste des ajustements
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const employeeProfileId = searchParams.get("employeeProfileId")
    const payrollId = searchParams.get("payrollId")
    const type = searchParams.get("type")
    const isRecurring = searchParams.get("isRecurring")

    const where: any = {}

    if (employeeProfileId) {
      where.employeeProfileId = employeeProfileId
    }
    if (payrollId) {
      where.payrollId = payrollId
    }
    if (type) {
      where.type = type
    }
    if (isRecurring !== null) {
      where.isRecurring = isRecurring === "true"
    }

    const adjustments = await prisma.payrollAdjustment.findMany({
      where,
      include: {
        employeeProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                name: true,
              },
            },
          },
        },
        payroll: {
          select: {
            id: true,
            number: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(adjustments)
  } catch (error) {
    console.error("Error fetching payroll adjustments:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des ajustements" },
      { status: 500 }
    )
  }
}

// POST - Créer un ajustement
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const {
      employeeProfileId,
      payrollId,
      type,
      description,
      amount,
      daysAffected,
      hoursAffected,
      reason,
      isRecurring,
    } = body

    // Validation
    if (!type || !description) {
      return NextResponse.json(
        { error: "Le type et la description sont requis" },
        { status: 400 }
      )
    }

    if (amount === undefined) {
      return NextResponse.json(
        { error: "Le montant est requis" },
        { status: 400 }
      )
    }

    if (!employeeProfileId && !payrollId) {
      return NextResponse.json(
        { error: "Un profil employé ou un bulletin doit être spécifié" },
        { status: 400 }
      )
    }

    // Vérifier que le profil ou le bulletin existe
    if (employeeProfileId) {
      const profile = await prisma.employeePayrollProfile.findUnique({
        where: { id: employeeProfileId },
      })
      if (!profile) {
        return NextResponse.json(
          { error: "Profil employé non trouvé" },
          { status: 404 }
        )
      }
    }

    if (payrollId) {
      const payroll = await prisma.payroll.findUnique({
        where: { id: payrollId },
      })
      if (!payroll) {
        return NextResponse.json(
          { error: "Bulletin non trouvé" },
          { status: 404 }
        )
      }
      if (payroll.status === "PAID" || payroll.status === "CANCELLED") {
        return NextResponse.json(
          { error: "Impossible d'ajouter un ajustement à un bulletin payé ou annulé" },
          { status: 400 }
        )
      }
    }

    const adjustment = await prisma.payrollAdjustment.create({
      data: {
        employeeProfileId,
        payrollId,
        type,
        description,
        amount,
        daysAffected,
        hoursAffected,
        reason,
        isRecurring: isRecurring || false,
        createdById: session?.user?.id || "",
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    // Si lié à un bulletin, créer une entrée d'audit
    if (payrollId) {
      await prisma.payrollAuditLog.create({
        data: {
          payrollId,
          userId: session?.user?.id || "",
          action: "ADD_ADJUSTMENT",
          comment: `Ajustement ajouté: ${type} - ${description} (${amount} FCFA)`,
        },
      })
    }

    return NextResponse.json(adjustment, { status: 201 })
  } catch (error) {
    console.error("Error creating payroll adjustment:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'ajustement" },
      { status: 500 }
    )
  }
}
