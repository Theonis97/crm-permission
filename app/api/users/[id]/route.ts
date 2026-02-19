import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, firstName, lastName, password, status } = body

    // Vérifier si l'email existe déjà (sauf pour cet utilisateur)
    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: {
            id,
          },
        },
      })

      if (existingUser) {
        return NextResponse.json({ error: "Email already exists" }, { status: 400 })
      }
    }

    // Préparer les données de mise à jour
    const updateData: any = {
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      status,
      updatedAt: new Date(),
    }

    // Inclure le mot de passe seulement s'il est fourni
    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que l'utilisateur ne se supprime pas lui-même
    if (id === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Supprimer toutes les relations qui n'ont pas onDelete: Cascade
    // Les relations avec Cascade (Account, Session, UserRole, Quote, Invoice, StoreUserRole) seront supprimées automatiquement
    await prisma.task.deleteMany({ where: { userId: id } })
    await prisma.opportunityParticipant.deleteMany({ where: { userId: id } })
    await prisma.auditLog.deleteMany({ where: { userId: id } })
    await prisma.stockMovement.deleteMany({ where: { userId: id } })
    await prisma.attendanceLog.deleteMany({ where: { userId: id } })
    await prisma.attendanceDevice.deleteMany({ where: { OR: [{ userId: id }, { approvedBy: id }] } })
    await prisma.attendanceQRToken.deleteMany({ where: { usedBy: id } })
    await prisma.pWAPushSubscription.deleteMany({ where: { userId: id } })
    await prisma.dayClose.deleteMany({ where: { userId: id } })

    // Paie - Dissocier les relations optionnelles
    await prisma.payroll.updateMany({ where: { validatedById: id }, data: { validatedById: null } })
    await prisma.payroll.updateMany({ where: { approvedById: id }, data: { approvedById: null } })
    await prisma.payrollAuditLog.deleteMany({ where: { userId: id } })
    await prisma.payrollAdjustment.deleteMany({ where: { createdById: id } })
    await prisma.payrollAccessCode.deleteMany({ where: { userId: id } })
    await prisma.moduleAccessConfig.updateMany({ where: { updatedById: id }, data: { updatedById: null } })

    // Profil de paie employé
    const payrollProfile = await prisma.employeePayrollProfile.findUnique({ where: { userId: id } })
    if (payrollProfile) {
      await prisma.employeeContribution.deleteMany({ where: { employeeProfileId: payrollProfile.id } })
      await prisma.employeeRubric.deleteMany({ where: { employeeProfileId: payrollProfile.id } })
      // Supprimer les bulletins liés au profil
      const payrolls = await prisma.payroll.findMany({ where: { employeeProfileId: payrollProfile.id }, select: { id: true } })
      const payrollIds = payrolls.map(p => p.id)
      if (payrollIds.length > 0) {
        await prisma.payrollRubricLine.deleteMany({ where: { payrollId: { in: payrollIds } } })
        await prisma.payrollContributionLine.deleteMany({ where: { payrollId: { in: payrollIds } } })
        await prisma.payrollAdjustment.deleteMany({ where: { payrollId: { in: payrollIds } } })
        await prisma.payrollAuditLog.deleteMany({ where: { payrollId: { in: payrollIds } } })
        await prisma.payrollPayment.deleteMany({ where: { payrollId: { in: payrollIds } } })
        await prisma.payroll.deleteMany({ where: { employeeProfileId: payrollProfile.id } })
      }
      await prisma.employeePayrollProfile.delete({ where: { userId: id } })
    }

    // Comptabilité - dissocier (createdById est requis, on ne peut pas mettre null)
    // Expense.createdById est requis (non nullable), on supprime les dépenses créées par cet utilisateur
    await prisma.expensePayment.deleteMany({ where: { paidById: id } })
    await prisma.expense.deleteMany({ where: { createdById: id } })
    await prisma.dailyRevenue.updateMany({ where: { createdById: id }, data: { createdById: null } })
    await prisma.accountingAccessCode.deleteMany({ where: { userId: id } })

    // GED
    await prisma.gedFavorite.deleteMany({ where: { userId: id } })
    await prisma.gedShare.deleteMany({ where: { OR: [{ sharedWithId: id }, { sharedById: id }] } })
    await prisma.gedFileVersion.deleteMany({ where: { createdById: id } })
    await prisma.gedFile.deleteMany({ where: { ownerId: id } })
    await prisma.gedFolder.deleteMany({ where: { ownerId: id } })

    // Contacts - assignedUserId est requis, on doit supprimer ou réassigner
    await prisma.contact.deleteMany({ where: { assignedUserId: id } })
    // StoreOrder.createdById est requis
    await prisma.storeOrder.deleteMany({ where: { createdById: id } })
    // Opportunity.ownerId est requis
    await prisma.opportunity.deleteMany({ where: { ownerId: id } })

    // Magasins et entrepôts
    await prisma.store.updateMany({ where: { managerId: id }, data: { managerId: null } })
    await prisma.warehouse.updateMany({ where: { managerId: id }, data: { managerId: null } })

    // Commandes d'approvisionnement - requestedBy est requis
    await prisma.order.updateMany({ where: { approvedBy: id }, data: { approvedBy: null } })
    await prisma.order.deleteMany({ where: { requestedBy: id } })

    // Livraisons
    await prisma.deliveryStockMovement.deleteMany({ where: { createdById: id } })
    await prisma.failedWhatsAppOrder.updateMany({ where: { resolvedBy: id }, data: { resolvedBy: null } })

    // SAV
    await prisma.productReturn.updateMany({ where: { processedById: id }, data: { processedById: null } })
    await prisma.productReturn.updateMany({ where: { sentToCashierById: id }, data: { sentToCashierById: null } })
    await prisma.productReturn.updateMany({ where: { cashierValidatedById: id }, data: { cashierValidatedById: null } })
    // createdById est requis sur ProductReturn
    await prisma.productReturn.deleteMany({ where: { createdById: id } })

    // Approvisionnement
    await prisma.restockingRequest.updateMany({ where: { approvedById: id }, data: { approvedById: null } })

    // Périodes de paie
    await prisma.payrollPeriod.updateMany({ where: { closedById: id }, data: { closedById: null } })
    await prisma.payrollCompanySettings.updateMany({ where: { updatedById: id }, data: { updatedById: null } })

    // Supprimer l'utilisateur (les relations Cascade se suppriment automatiquement)
    await prisma.user.delete({
      where: { id },
    })

    const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email
    return NextResponse.json({ success: true, message: `Utilisateur ${displayName} supprimé avec succès` })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    )
  }
}
