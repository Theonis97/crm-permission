import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import { calculateRates } from "@/lib/payroll-calculator"

// GET - Liste des profils employés pour la paie
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const employeeType = searchParams.get("employeeType")
    const contractType = searchParams.get("contractType")
    const isActive = searchParams.get("isActive")

    const where: any = {}

    if (employeeType) {
      where.employeeType = employeeType
    }
    if (contractType) {
      where.contractType = contractType
    }
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }

    const profiles = await prisma.employeePayrollProfile.findMany({
      where,
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
          },
        },
        _count: {
          select: {
            payrolls: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(profiles)
  } catch (error) {
    console.error("Error fetching payroll profiles:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des profils" },
      { status: 500 }
    )
  }
}

// POST - Créer un profil employé pour la paie
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const {
      userId,
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
      isActive,
      bankName,
      bankAccountNumber,
      contributionIds,
    } = body

    // Validation
    if (!userId) {
      return NextResponse.json(
        { error: "L'ID de l'utilisateur est requis" },
        { status: 400 }
      )
    }

    if (baseSalary === undefined || baseSalary < 0) {
      return NextResponse.json(
        { error: "Le salaire de base est requis et doit être positif" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier qu'un profil n'existe pas déjà
    const existingProfile = await prisma.employeePayrollProfile.findUnique({
      where: { userId },
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: "Un profil de paie existe déjà pour cet utilisateur" },
        { status: 409 }
      )
    }

    // Calculer les taux journalier et horaire
    // Nombre de jours par mois basé sur le pattern (approximation: 4 semaines)
    const daysPattern = workingDaysPattern || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]
    const daysPerMonth = Math.round(daysPattern.length * 4.33) // ~4.33 semaines par mois
    const hoursPerDay = workingHoursPerDay || 8
    const { dailyRate, hourlyRate } = calculateRates(
      baseSalary,
      daysPerMonth,
      hoursPerDay
    )

    // Créer le profil avec transaction pour inclure les cotisations
    const profile = await prisma.$transaction(async (tx) => {
      // Créer le profil employé
      const newProfile = await tx.employeePayrollProfile.create({
        data: {
          userId,
          employeeType: employeeType || "DECLARED",
          contractType: contractType || "CDI",
          baseSalary,
          salaryIsNet: salaryIsNet || false,
          workingDaysPattern: daysPattern,
          workingHoursPerDay: hoursPerDay,
          dailyRate,
          hourlyRate,
          overtimeRate: overtimeRate || 1.5,
          position: position || null,
          hireDate: hireDate ? new Date(hireDate) : null,
          contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
          isActive: isActive !== undefined ? isActive : true,
          bankName,
          bankAccountNumber,
        },
      })

      // Créer les associations de cotisations si fournies
      if (contributionIds && Array.isArray(contributionIds) && contributionIds.length > 0) {
        await tx.employeeContribution.createMany({
          data: contributionIds.map((contributionId: string) => ({
            employeeProfileId: newProfile.id,
            contributionId,
            isActive: true,
          })),
        })
      }

      // Retourner le profil avec les relations
      return tx.employeePayrollProfile.findUnique({
        where: { id: newProfile.id },
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

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    console.error("Error creating payroll profile:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du profil" },
      { status: 500 }
    )
  }
}
