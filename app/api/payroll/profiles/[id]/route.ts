import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { calculateRates } from "@/lib/payroll-calculator"

// GET - Récupérer un profil employé spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const profile = await prisma.employeePayrollProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
            matricule: true,
            status: true,
            image: true,
          },
        },
        contributions: {
          include: {
            contribution: true,
          },
        },
        payrolls: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            number: true,
            status: true,
            netSalary: true,
            period: {
              select: {
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        adjustments: {
          where: { isRecurring: true },
          select: {
            id: true,
            type: true,
            description: true,
            amount: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error fetching payroll profile:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du profil" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un profil employé
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
      employeeType,
      contractType,
      baseSalary,
      salaryIsNet,
      workingDaysPattern,
      workingHoursPerDay,
      overtimeRate,
      position,
      hireDate,
      contractEndDate,
      bankName,
      bankAccountNumber,
      isActive,
      contributionIds,
    } = body

    // Vérifier que le profil existe
    const existingProfile = await prisma.employeePayrollProfile.findUnique({
      where: { id },
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      )
    }

    // Préparer les données de mise à jour
    const updateData: any = {}

    if (employeeType !== undefined) updateData.employeeType = employeeType
    if (contractType !== undefined) updateData.contractType = contractType
    if (salaryIsNet !== undefined) updateData.salaryIsNet = salaryIsNet
    if (overtimeRate !== undefined) updateData.overtimeRate = overtimeRate
    if (position !== undefined) updateData.position = position
    if (bankName !== undefined) updateData.bankName = bankName
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber
    if (isActive !== undefined) updateData.isActive = isActive
    if (workingDaysPattern !== undefined) updateData.workingDaysPattern = workingDaysPattern

    if (hireDate !== undefined) {
      updateData.hireDate = hireDate ? new Date(hireDate) : null
    }
    if (contractEndDate !== undefined) {
      updateData.contractEndDate = contractEndDate ? new Date(contractEndDate) : null
    }

    // Recalculer les taux si le salaire ou les paramètres changent
    const newBaseSalary = baseSalary !== undefined ? baseSalary : existingProfile.baseSalary
    const daysPattern = workingDaysPattern || existingProfile.workingDaysPattern || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    const newDaysPerMonth = Math.round(daysPattern.length * 4.33)
    const newHoursPerDay = workingHoursPerDay !== undefined ? workingHoursPerDay : existingProfile.workingHoursPerDay

    if (
      baseSalary !== undefined ||
      workingDaysPattern !== undefined ||
      workingHoursPerDay !== undefined
    ) {
      const { dailyRate, hourlyRate } = calculateRates(
        newBaseSalary,
        newDaysPerMonth,
        newHoursPerDay
      )
      updateData.baseSalary = newBaseSalary
      updateData.workingHoursPerDay = newHoursPerDay
      updateData.dailyRate = dailyRate
      updateData.hourlyRate = hourlyRate
    }

    // Utiliser une transaction pour mettre à jour le profil et les cotisations
    const profile = await prisma.$transaction(async (tx) => {
      // Mettre à jour le profil
      const updatedProfile = await tx.employeePayrollProfile.update({
        where: { id },
        data: updateData,
      })

      // Mettre à jour les cotisations si fournies
      if (contributionIds !== undefined) {
        // Supprimer les anciennes cotisations
        await tx.employeeContribution.deleteMany({
          where: { employeeProfileId: id },
        })

        // Créer les nouvelles cotisations
        if (Array.isArray(contributionIds) && contributionIds.length > 0) {
          await tx.employeeContribution.createMany({
            data: contributionIds.map((contributionId: string) => ({
              employeeProfileId: id,
              contributionId,
              isActive: true,
            })),
          })
        }
      }

      // Retourner le profil avec les relations
      return tx.employeePayrollProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              name: true,
              matricule: true,
            },
          },
          contributions: {
            include: {
              contribution: true,
            },
          },
        },
      })
    })

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error updating payroll profile:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un profil employé
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que le profil existe
    const existingProfile = await prisma.employeePayrollProfile.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payrolls: true },
        },
      },
    })

    if (!existingProfile) {
      return NextResponse.json(
        { error: "Profil non trouvé" },
        { status: 404 }
      )
    }

    // Empêcher la suppression si des bulletins existent
    if (existingProfile._count.payrolls > 0) {
      return NextResponse.json(
        { error: "Impossible de supprimer un profil avec des bulletins de paie existants. Désactivez-le plutôt." },
        { status: 400 }
      )
    }

    await prisma.employeePayrollProfile.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Profil supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting payroll profile:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du profil" },
      { status: 500 }
    )
  }
}
