import { NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

/** Liste des profils employés (paie) pour listes déroulantes — ex. assignation de rubriques */
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const employees = await prisma.employeePayrollProfile.findMany({
      where: { isActive: true },
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
      orderBy: [{ user: { lastName: "asc" } }, { user: { firstName: "asc" } }],
    })

    return NextResponse.json({ employees })
  } catch (err) {
    console.error("[PAYROLL_EMPLOYEES_GET]", err)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des employés" },
      { status: 500 },
    )
  }
}
