import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import {
  calculateGrossSalary,
  calculateWorkingDaysInPeriod,
} from "@/lib/payroll-calculator"

// GET - Récupérer un bulletin de paie spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employeeProfile: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                name: true,
                matricule: true,
                image: true,
              },
            },
            contributions: {
              where: { isActive: true },
              include: {
                contribution: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    rate: true,
                  },
                },
              },
            },
          },
        },
        period: true,
        validatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        contributionLines: {
          include: {
            contribution: {
              select: {
                id: true,
                name: true,
                code: true,
                isEmployeeShare: true,
                isEmployerShare: true,
              },
            },
          },
          orderBy: {
            contribution: {
              displayOrder: "asc",
            },
          },
        },
        adjustments: {
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
        },
        rubricLines: {
          orderBy: [
            { rubricType: "asc" },
            { rubricName: "asc" },
          ],
        },
        auditLogs: {
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
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    })

    if (!payroll) {
      return NextResponse.json(
        { error: "Bulletin non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json(payroll)
  } catch (error) {
    console.error("Error fetching payroll:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du bulletin" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour un bulletin de paie
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
      daysWorked,
      hoursWorked,
      overtimeHours,
      absenceDays,
      grossSalary,
      totalBonuses,
      netSalary,
      comment,
      rubricLines,
    } = body

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

    // Vérifier que le bulletin peut être modifié
    if (existing.status === "PAID" || existing.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Impossible de modifier un bulletin payé ou annulé" },
        { status: 400 }
      )
    }

    const updateData: any = {}
    const changes: Array<{ field: string; oldValue: string; newValue: string }> = []

    // Tracker les modifications
    if (daysWorked !== undefined && daysWorked !== existing.daysWorked) {
      changes.push({
        field: "daysWorked",
        oldValue: String(existing.daysWorked),
        newValue: String(daysWorked),
      })
      updateData.daysWorked = daysWorked
    }

    if (hoursWorked !== undefined && hoursWorked !== existing.hoursWorked) {
      changes.push({
        field: "hoursWorked",
        oldValue: String(existing.hoursWorked),
        newValue: String(hoursWorked),
      })
      updateData.hoursWorked = hoursWorked
    }

    if (overtimeHours !== undefined && overtimeHours !== existing.overtimeHours) {
      changes.push({
        field: "overtimeHours",
        oldValue: String(existing.overtimeHours),
        newValue: String(overtimeHours),
      })
      updateData.overtimeHours = overtimeHours
    }

    if (absenceDays !== undefined && absenceDays !== existing.absenceDays) {
      changes.push({
        field: "absenceDays",
        oldValue: String(existing.absenceDays),
        newValue: String(absenceDays),
      })
      updateData.absenceDays = absenceDays
    }

    // Flag pour savoir si on doit recalculer les cotisations
    let shouldRecalculateContributions = false

    if (grossSalary !== undefined && grossSalary !== existing.grossSalary) {
      changes.push({
        field: "grossSalary",
        oldValue: String(existing.grossSalary),
        newValue: String(grossSalary),
      })
      updateData.grossSalary = grossSalary
      shouldRecalculateContributions = true
    }

    // Brut (donc net et net à payer) depuis jours / heures / heures sup. — sans brut manuel
    const mergedDays = daysWorked !== undefined ? daysWorked : existing.daysWorked
    const mergedHours = hoursWorked !== undefined ? hoursWorked : existing.hoursWorked
    const mergedOT = overtimeHours !== undefined ? overtimeHours : existing.overtimeHours
    const hoursWorkloadChanged =
      grossSalary === undefined &&
      ((daysWorked !== undefined && daysWorked !== existing.daysWorked) ||
        (hoursWorked !== undefined && hoursWorked !== existing.hoursWorked) ||
        (overtimeHours !== undefined && overtimeHours !== existing.overtimeHours))

    if (hoursWorkloadChanged) {
      const [employeeProfileHw, periodHw] = await Promise.all([
        prisma.employeePayrollProfile.findUnique({
          where: { id: existing.employeeProfileId },
        }),
        prisma.payrollPeriod.findUnique({ where: { id: existing.periodId } }),
      ])
      if (employeeProfileHw && periodHw) {
        const expectedWorkingDays = calculateWorkingDaysInPeriod(
          periodHw.startDate,
          periodHw.endDate,
          employeeProfileHw.workingDaysPattern,
        )
        const newGrossFromHours = calculateGrossSalary(
          {
            contractType: employeeProfileHw.contractType,
            baseSalary: employeeProfileHw.baseSalary,
            dailyRate: employeeProfileHw.dailyRate,
            hourlyRate: employeeProfileHw.hourlyRate,
            workingDaysPattern: employeeProfileHw.workingDaysPattern,
            workingHoursPerDay: employeeProfileHw.workingHoursPerDay,
          },
          mergedDays,
          mergedHours,
          mergedOT,
          employeeProfileHw.overtimeRate,
          expectedWorkingDays,
        )
        if (Math.round(newGrossFromHours * 100) !== Math.round(existing.grossSalary * 100)) {
          updateData.grossSalary = newGrossFromHours
          changes.push({
            field: "grossSalary",
            oldValue: String(existing.grossSalary),
            newValue: String(newGrossFromHours),
          })
          shouldRecalculateContributions = true
        }
      }
    }

    if (totalBonuses !== undefined && totalBonuses !== existing.totalBonuses) {
      changes.push({
        field: "totalBonuses",
        oldValue: String(existing.totalBonuses),
        newValue: String(totalBonuses),
      })
      updateData.totalBonuses = totalBonuses
    }

    if (netSalary !== undefined && netSalary !== existing.netSalary) {
      changes.push({
        field: "netSalary",
        oldValue: String(existing.netSalary),
        newValue: String(netSalary),
      })
      updateData.netSalary = netSalary
    }

    // Recalculer les cotisations si le salaire brut a changé
    if (shouldRecalculateContributions) {
      const newGrossSalary =
        updateData.grossSalary !== undefined
          ? updateData.grossSalary
          : grossSalary !== undefined
            ? grossSalary
            : existing.grossSalary

      // Récupérer le profil employé avec ses cotisations
      const employeeProfile = await prisma.employeePayrollProfile.findUnique({
        where: { id: existing.employeeProfileId },
        include: {
          contributions: {
            where: { isActive: true },
            include: {
              contribution: true,
            },
          },
        },
      })

      if (employeeProfile) {
        // Supprimer les anciennes lignes de cotisation
        await prisma.payrollContributionLine.deleteMany({
          where: { payrollId: id },
        })

        // Recalculer et créer les nouvelles lignes de cotisation
        let totalEmployeeDeductions = 0
        let totalEmployerCharges = 0

        for (const ec of employeeProfile.contributions) {
          const contribution = ec.contribution
          const appliedRate = ec.customRate ?? contribution.rate
          const baseAmount = newGrossSalary
          const amount = Math.round((baseAmount * appliedRate) / 100 * 100) / 100

          await prisma.payrollContributionLine.create({
            data: {
              payrollId: id,
              contributionId: contribution.id,
              baseAmount,
              appliedRate,
              amount,
            },
          })

          if (contribution.isEmployeeShare) {
            totalEmployeeDeductions += amount
          }
          if (contribution.isEmployerShare) {
            totalEmployerCharges += amount
          }
        }

        // Mettre à jour les totaux de déductions et charges
        updateData.totalDeductions = totalEmployeeDeductions
        updateData.employerCharges = totalEmployerCharges

        // Primes / indemnités : seules les rubriques « à payer » entrent dans le net
        const rubricLinesNet = await prisma.payrollRubricLine.findMany({
          where: { payrollId: id },
          select: { amount: true, isAlreadyDisbursed: true, rubricType: true },
        })
        const rubricsTotalTowardNet = rubricLinesNet.reduce(
          (s, l) =>
            s +
            (l.rubricType === "INDEMNITY" || l.isAlreadyDisbursed ? 0 : l.amount),
          0,
        )

        // Recalculer le salaire net (brut − cotisations salariales + rubriques payables)
        const finalGrossSalary = newGrossSalary
        updateData.netSalary = Math.max(
          0,
          finalGrossSalary + rubricsTotalTowardNet - totalEmployeeDeductions,
        )

        // Reste à payer = net − déjà versé (inclut l’impact des heures sup. dans le net)
        const paid = existing.paidAmount ?? 0
        updateData.remainingAmount = Math.max(0, updateData.netSalary - paid)

        // Ajouter les changements de cotisations à l'audit
        if (totalEmployeeDeductions !== existing.totalDeductions) {
          changes.push({
            field: "totalDeductions",
            oldValue: String(existing.totalDeductions),
            newValue: String(totalEmployeeDeductions),
          })
        }
      }
    }

    // Gérer les rubricLines (primes/indemnités)
    if (rubricLines !== undefined && Array.isArray(rubricLines)) {
      // Supprimer les anciennes lignes de rubriques
      await prisma.payrollRubricLine.deleteMany({
        where: { payrollId: id },
      })

      // Créer les nouvelles lignes de rubriques
      if (rubricLines.length > 0) {
        await prisma.payrollRubricLine.createMany({
          data: rubricLines.map((line: any) => ({
            payrollId: id,
            rubricId: line.rubricId,
            rubricCode: line.rubricCode,
            rubricName: line.rubricName,
            rubricType: line.rubricType,
            baseAmount: line.amount, // Base = montant pour les montants fixes
            rate: null,
            amount: line.amount,
            isSubjectToTax: line.isSubjectToTax || false,
            isSubjectToSocial: line.isSubjectToSocial || false,
            exemptAmount: 0,
            taxableAmount: line.isSubjectToTax ? line.amount : 0,
            isAlreadyDisbursed:
              line.rubricType === "INDEMNITY" || !!line.isAlreadyDisbursed,
          })),
        })

        // Calculer le total des rubriques
        const totalRubrics = rubricLines.reduce((sum: number, line: any) => sum + (line.amount || 0), 0)
        const totalRubricsTowardNet = rubricLines.reduce(
          (sum: number, line: any) =>
            sum +
            (line.rubricType === "INDEMNITY" || line.isAlreadyDisbursed
              ? 0
              : (line.amount || 0)),
          0,
        )
        updateData.totalBonuses = totalRubrics

        // Recalculer le salaire net avec les rubriques
        const finalGrossSalary = updateData.grossSalary !== undefined ? updateData.grossSalary : existing.grossSalary
        const finalDeductions = updateData.totalDeductions !== undefined ? updateData.totalDeductions : existing.totalDeductions
        updateData.netSalary = Math.max(0, finalGrossSalary + totalRubricsTowardNet - finalDeductions)
        updateData.remainingAmount = Math.max(
          0,
          updateData.netSalary - (existing.paidAmount ?? 0),
        )

        changes.push({
          field: "rubricLines",
          oldValue: "[]",
          newValue: JSON.stringify(rubricLines.map((r: any) => ({ name: r.rubricName, amount: r.amount }))),
        })
      } else {
        // Si aucune rubrique, mettre totalBonuses à 0
        updateData.totalBonuses = 0
        const finalGrossSalary = updateData.grossSalary !== undefined ? updateData.grossSalary : existing.grossSalary
        const finalDeductions = updateData.totalDeductions !== undefined ? updateData.totalDeductions : existing.totalDeductions
        updateData.netSalary = Math.max(0, finalGrossSalary - finalDeductions)
        updateData.remainingAmount = Math.max(
          0,
          updateData.netSalary - (existing.paidAmount ?? 0),
        )
      }
    }

    // Mettre à jour le bulletin
    const payroll = await prisma.payroll.update({
      where: { id },
      data: updateData,
    })

    // Créer les entrées d'audit pour chaque modification
    if (changes.length > 0) {
      await prisma.payrollAuditLog.createMany({
        data: changes.map((change) => ({
          payrollId: id,
          userId: session?.user?.id || "",
          action: "UPDATE",
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          comment: comment || null,
        })),
      })
    }

    return NextResponse.json(payroll)
  } catch (error) {
    console.error("Error updating payroll:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour du bulletin" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un bulletin de paie
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

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

    if (existing.status === "PAID" || existing.status === "PARTIALLY_PAID") {
      return NextResponse.json(
        { error: "Impossible de supprimer un bulletin déjà payé ou partiellement payé" },
        { status: 400 }
      )
    }

    // Supprimer les dépendances
    await prisma.payrollRubricLine.deleteMany({ where: { payrollId: id } })
    await prisma.payrollContributionLine.deleteMany({ where: { payrollId: id } })
    await prisma.payrollAdjustment.deleteMany({ where: { payrollId: id } })
    await prisma.payrollAuditLog.deleteMany({ where: { payrollId: id } })

    // Supprimer le bulletin
    await prisma.payroll.delete({ where: { id } })

    const employeeName = `${existing.employeeProfile.user.firstName || ""} ${existing.employeeProfile.user.lastName || ""}`.trim()

    return NextResponse.json({
      success: true,
      message: `Bulletin ${existing.number} de ${employeeName} supprimé`,
    })
  } catch (error) {
    console.error("Error deleting payroll:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du bulletin" },
      { status: 500 }
    )
  }
}
