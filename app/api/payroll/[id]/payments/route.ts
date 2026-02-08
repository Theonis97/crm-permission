import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer l'historique des versements d'un bulletin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que le bulletin existe
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      select: {
        id: true,
        number: true,
        netSalary: true,
        paidAmount: true,
        remainingAmount: true,
        status: true,
      },
    })

    if (!payroll) {
      return NextResponse.json(
        { error: "Bulletin non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer tous les versements
    const payments = await prisma.payrollPayment.findMany({
      where: { payrollId: id },
      include: {
        paidBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    })

    return NextResponse.json({
      success: true,
      payroll: {
        id: payroll.id,
        number: payroll.number,
        netSalary: payroll.netSalary,
        paidAmount: payroll.paidAmount,
        remainingAmount: payroll.remainingAmount,
        status: payroll.status,
      },
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMode: p.paymentMode,
        reference: p.reference,
        notes: p.notes,
        paidBy: {
          id: p.paidBy.id,
          name: `${p.paidBy.firstName || ""} ${p.paidBy.lastName || ""}`.trim() || p.paidBy.name || "Utilisateur",
        },
        createdAt: p.createdAt,
      })),
      totalPayments: payments.length,
    })
  } catch (error) {
    console.error("Error fetching payroll payments:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des versements" },
      { status: 500 }
    )
  }
}
