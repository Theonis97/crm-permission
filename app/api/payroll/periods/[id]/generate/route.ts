import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import {
  calculatePayroll,
  getAttendanceData,
  generatePayrollNumber,
} from "@/lib/payroll-calculator"

// POST - Générer les bulletins de paie pour une période
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { employeeProfileIds } = body // Optionnel: liste d'IDs spécifiques

    // Récupérer la période
    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Période non trouvée" },
        { status: 404 }
      )
    }

    if (period.isClosed) {
      return NextResponse.json(
        { error: "Impossible de générer des bulletins pour une période clôturée" },
        { status: 400 }
      )
    }

    // Récupérer les profils employés actifs
    const whereProfiles: any = { isActive: true }
    if (employeeProfileIds && employeeProfileIds.length > 0) {
      whereProfiles.id = { in: employeeProfileIds }
    }

    const profiles = await prisma.employeePayrollProfile.findMany({
      where: whereProfiles,
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
    })

    if (profiles.length === 0) {
      return NextResponse.json(
        { error: "Aucun profil employé actif trouvé" },
        { status: 404 }
      )
    }

    // Vérifier les bulletins existants pour cette période
    const existingPayrolls = await prisma.payroll.findMany({
      where: {
        periodId: id,
        employeeProfileId: { in: profiles.map((p) => p.id) },
      },
      select: { employeeProfileId: true },
    })

    const existingProfileIds = new Set(existingPayrolls.map((p) => p.employeeProfileId))

    // Filtrer les profils sans bulletin existant
    const profilesToProcess = profiles.filter((p) => !existingProfileIds.has(p.id))

    if (profilesToProcess.length === 0) {
      return NextResponse.json(
        { error: "Tous les bulletins ont déjà été générés pour cette période" },
        { status: 400 }
      )
    }

    // Générer les bulletins
    const createdPayrolls = []
    const errors = []

    // Compter les bulletins existants pour la numérotation
    const existingCount = await prisma.payroll.count({
      where: {
        periodId: id,
      },
    })

    let index = existingCount + 1

    for (const profile of profilesToProcess) {
      try {
        // Récupérer les données de pointage
        const attendanceData = await getAttendanceData(
          profile.userId,
          period.startDate,
          period.endDate
        )

        // Calculer le bulletin
        const calculation = await calculatePayroll({
          employeeProfileId: profile.id,
          periodId: id,
          attendanceData,
        })

        // Générer le numéro de bulletin
        const number = generatePayrollNumber(period.name, index)

        // Créer le bulletin
        const payroll = await prisma.payroll.create({
          data: {
            number,
            employeeProfileId: profile.id,
            periodId: id,
            daysWorked: calculation.daysWorked,
            hoursWorked: calculation.hoursWorked,
            overtimeHours: calculation.overtimeHours,
            absenceDays: calculation.absenceDays,
            rawDaysWorked: calculation.rawDaysWorked,
            rawHoursWorked: calculation.rawHoursWorked,
            expectedWorkingDays: calculation.expectedWorkingDays,
            grossSalary: calculation.grossSalary,
            totalDeductions: calculation.totalDeductions,
            totalBonuses: calculation.totalBonuses,
            netSalary: calculation.netSalary,
            employerCharges: calculation.employerCharges,
            status: "DRAFT",
          },
        })

        // Créer les lignes de cotisations
        if (calculation.contributionLines.length > 0) {
          await prisma.payrollContributionLine.createMany({
            data: calculation.contributionLines.map((line) => ({
              payrollId: payroll.id,
              contributionId: line.contributionId,
              baseAmount: line.baseAmount,
              appliedRate: line.rate,
              amount: line.amount,
            })),
          })
        }

        // Créer les lignes de rubriques (primes et indemnités)
        if (calculation.rubricLines.length > 0) {
          await prisma.payrollRubricLine.createMany({
            data: calculation.rubricLines.map((line) => ({
              payrollId: payroll.id,
              rubricId: line.rubricId,
              rubricCode: line.rubricCode,
              rubricName: line.rubricName,
              rubricType: line.rubricType,
              baseAmount: line.baseAmount,
              rate: line.rate,
              amount: line.amount,
              isSubjectToTax: line.isSubjectToTax,
              isSubjectToSocial: line.isSubjectToSocial,
              exemptAmount: line.exemptAmount,
              taxableAmount: line.taxableAmount,
            })),
          })
        }

        // Créer l'entrée d'audit
        await prisma.payrollAuditLog.create({
          data: {
            payrollId: payroll.id,
            userId: session?.user?.id || "",
            action: "CREATE",
            comment: `Bulletin généré automatiquement pour la période ${period.name}`,
          },
        })

        createdPayrolls.push({
          id: payroll.id,
          number: payroll.number,
          employee: `${profile.user.firstName} ${profile.user.lastName}`,
          netSalary: payroll.netSalary,
        })

        index++
      } catch (err: any) {
        errors.push({
          employeeId: profile.userId,
          employee: `${profile.user.firstName} ${profile.user.lastName}`,
          error: err.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdPayrolls.length} bulletin(s) généré(s)`,
      created: createdPayrolls,
      errors: errors.length > 0 ? errors : undefined,
      skipped: existingProfileIds.size,
    })
  } catch (error) {
    console.error("Error generating payrolls:", error)
    return NextResponse.json(
      { error: "Erreur lors de la génération des bulletins" },
      { status: 500 }
    )
  }
}
