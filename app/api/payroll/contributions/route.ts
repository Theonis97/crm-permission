import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Liste des cotisations
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get("isActive")
    const declaredOnly = searchParams.get("declaredOnly")

    const where: any = {}

    if (isActive !== null) {
      where.isActive = isActive === "true"
    }
    if (declaredOnly !== null) {
      where.declaredOnly = declaredOnly === "true"
    }

    const contributions = await prisma.payrollContribution.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    })

    return NextResponse.json(contributions)
  } catch (error) {
    console.error("Error fetching payroll contributions:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des cotisations" },
      { status: 500 }
    )
  }
}

// POST - Créer une cotisation
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const {
      name,
      code,
      description,
      isEmployeeShare,
      isEmployerShare,
      rate,
      ceiling,
      declaredOnly,
      displayOrder,
    } = body

    // Validation
    if (!name || !code) {
      return NextResponse.json(
        { error: "Le nom et le code sont requis" },
        { status: 400 }
      )
    }

    if (rate === undefined || rate < 0) {
      return NextResponse.json(
        { error: "Le taux est requis et doit être positif" },
        { status: 400 }
      )
    }

    // Vérifier l'unicité du nom et du code
    const existing = await prisma.payrollContribution.findFirst({
      where: {
        OR: [{ name }, { code }],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Une cotisation avec ce nom ou ce code existe déjà" },
        { status: 409 }
      )
    }

    const contribution = await prisma.payrollContribution.create({
      data: {
        name,
        code,
        description,
        isEmployeeShare: isEmployeeShare ?? true,
        isEmployerShare: isEmployerShare ?? false,
        rate,
        ceiling,
        declaredOnly: declaredOnly ?? true,
        displayOrder: displayOrder ?? 0,
      },
    })

    return NextResponse.json(contribution, { status: 201 })
  } catch (error) {
    console.error("Error creating payroll contribution:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la cotisation" },
      { status: 500 }
    )
  }
}
