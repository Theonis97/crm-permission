import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer une période spécifique avec ses bulletins
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        closedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        payrolls: {
          include: {
            employeeProfile: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    name: true,
                    matricule: true,
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
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Période non trouvée" },
        { status: 404 }
      )
    }

    // Calculer les statistiques
    const stats = {
      totalPayrolls: period.payrolls.length,
      totalGross: period.payrolls.reduce((sum, p) => sum + p.grossSalary, 0),
      totalNet: period.payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      totalDeductions: period.payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      byStatus: {
        DRAFT: period.payrolls.filter((p) => p.status === "DRAFT").length,
        PENDING: period.payrolls.filter((p) => p.status === "PENDING").length,
        VALIDATED: period.payrolls.filter((p) => p.status === "VALIDATED").length,
        APPROVED: period.payrolls.filter((p) => p.status === "APPROVED").length,
        PAID: period.payrolls.filter((p) => p.status === "PAID").length,
        CANCELLED: period.payrolls.filter((p) => p.status === "CANCELLED").length,
      },
    }

    return NextResponse.json({ ...period, stats })
  } catch (error) {
    console.error("Error fetching payroll period:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la période" },
      { status: 500 }
    )
  }
}

// PUT - Mettre à jour ou clôturer une période
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { name, workingDays, close } = body

    // Vérifier que la période existe
    const existing = await prisma.payrollPeriod.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Période non trouvée" },
        { status: 404 }
      )
    }

    // Si la période est déjà clôturée, on ne peut plus la modifier
    if (existing.isClosed && !close) {
      return NextResponse.json(
        { error: "Impossible de modifier une période clôturée" },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (name !== undefined) updateData.name = name
    if (workingDays !== undefined) updateData.workingDays = workingDays

    // Clôturer la période
    if (close === true && !existing.isClosed) {
      updateData.isClosed = true
      updateData.closedAt = new Date()
      updateData.closedById = session?.user?.id
    }

    const period = await prisma.payrollPeriod.update({
      where: { id },
      data: updateData,
      include: {
        closedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error("Error updating payroll period:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la période" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une période et/ou ses bulletins
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const deletePayrolls = searchParams.get("deletePayrolls") === "true"
    const deletePeriod = searchParams.get("deletePeriod") === "true"

    // Vérifier que la période existe
    const existing = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { payrolls: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Période non trouvée" },
        { status: 404 }
      )
    }

    if (existing.isClosed) {
      return NextResponse.json(
        { error: "Impossible de supprimer une période clôturée" },
        { status: 400 }
      )
    }

    // Supprimer la période complète avec tous ses bulletins
    if (deletePeriod) {
      const payrollIds = await prisma.payroll.findMany({
        where: { periodId: id },
        select: { id: true },
      })

      const ids = payrollIds.map((p) => p.id)

      // Supprimer séquentiellement sans transaction interactive (évite le timeout)
      if (ids.length > 0) {
        // Supprimer les dépendances des bulletins
        await prisma.payrollContributionLine.deleteMany({
          where: { payrollId: { in: ids } },
        })
        await prisma.payrollAdjustment.deleteMany({
          where: { payrollId: { in: ids } },
        })
        await prisma.payrollAuditLog.deleteMany({
          where: { payrollId: { in: ids } },
        })

        // Supprimer les bulletins
        await prisma.payroll.deleteMany({
          where: { periodId: id },
        })
      }

      // Supprimer la période
      await prisma.payrollPeriod.delete({
        where: { id },
      })

      return NextResponse.json({
        success: true,
        message: `Période "${existing.name}" supprimée avec ${ids.length} bulletin(s)`,
        deletedPayrollsCount: ids.length,
      })
    }

    // Supprimer uniquement les bulletins (pour régénération)
    if (deletePayrolls) {
      const payrollIds = await prisma.payroll.findMany({
        where: { periodId: id },
        select: { id: true },
      })

      const ids = payrollIds.map((p) => p.id)

      if (ids.length > 0) {
        // Supprimer séquentiellement sans transaction interactive
        await prisma.payrollContributionLine.deleteMany({
          where: { payrollId: { in: ids } },
        })
        await prisma.payrollAdjustment.deleteMany({
          where: { payrollId: { in: ids } },
        })
        await prisma.payrollAuditLog.deleteMany({
          where: { payrollId: { in: ids } },
        })

        // Supprimer les bulletins
        await prisma.payroll.deleteMany({
          where: { periodId: id },
        })
      }

      return NextResponse.json({
        success: true,
        message: `${ids.length} bulletin(s) supprimé(s)`,
        deletedCount: ids.length,
      })
    }

    return NextResponse.json(
      { error: "Paramètre deletePayrolls ou deletePeriod requis" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error deleting payrolls/period:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
