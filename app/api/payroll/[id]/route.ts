import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

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
      const newGrossSalary = grossSalary || existing.grossSalary

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
          const baseAmount = newGrossSalary
          const amount = Math.round((baseAmount * contribution.rate / 100) * 100) / 100

          await prisma.payrollContributionLine.create({
            data: {
              payrollId: id,
              contributionId: contribution.id,
              baseAmount,
              appliedRate: contribution.rate,
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

        // Recalculer le salaire net
        const finalGrossSalary = updateData.grossSalary || existing.grossSalary
        const finalBonuses = updateData.totalBonuses !== undefined ? updateData.totalBonuses : existing.totalBonuses
        updateData.netSalary = Math.max(0, finalGrossSalary + finalBonuses - totalEmployeeDeductions)

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
          })),
        })

        // Calculer le total des rubriques
        const totalRubrics = rubricLines.reduce((sum: number, line: any) => sum + (line.amount || 0), 0)
        updateData.totalBonuses = totalRubrics

        // Recalculer le salaire net avec les rubriques
        const finalGrossSalary = updateData.grossSalary !== undefined ? updateData.grossSalary : existing.grossSalary
        const finalDeductions = updateData.totalDeductions !== undefined ? updateData.totalDeductions : existing.totalDeductions
        updateData.netSalary = Math.max(0, finalGrossSalary + totalRubrics - finalDeductions)

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
