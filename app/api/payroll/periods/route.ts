import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Liste des périodes de paie
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const isClosed = searchParams.get("isClosed")
    const year = searchParams.get("year")

    const where: any = {}

    if (isClosed !== null) {
      where.isClosed = isClosed === "true"
    }

    if (year) {
      const yearStart = new Date(`${year}-01-01`)
      const yearEnd = new Date(`${year}-12-31`)
      where.startDate = {
        gte: yearStart,
        lte: yearEnd,
      }
    }

    const periods = await prisma.payrollPeriod.findMany({
      where,
      include: {
        closedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
        _count: {
          select: {
            payrolls: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    })

    return NextResponse.json(periods)
  } catch (error) {
    console.error("Error fetching payroll periods:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des périodes" },
      { status: 500 }
    )
  }
}

// POST - Créer une période de paie
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { name, periodType, startDate, endDate, workingDays } = body

    // Validation
    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Le nom, la date de début et la date de fin sont requis" },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (start >= end) {
      return NextResponse.json(
        { error: "La date de fin doit être postérieure à la date de début" },
        { status: 400 }
      )
    }

    // Vérifier qu'il n'y a pas de chevauchement avec une période existante
    const overlapping = await prisma.payrollPeriod.findFirst({
      where: {
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: `Cette période chevauche une période existante: ${overlapping.name}` },
        { status: 409 }
      )
    }

    // Calculer les jours ouvrés si non fournis (approximation)
    let calculatedWorkingDays = workingDays
    if (!calculatedWorkingDays) {
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      // Approximation: 5/7 des jours sont ouvrés
      calculatedWorkingDays = Math.round((diffDays * 5) / 7)
    }

    const period = await prisma.payrollPeriod.create({
      data: {
        name,
        periodType: periodType || "MONTHLY",
        startDate: start,
        endDate: end,
        workingDays: calculatedWorkingDays,
      },
    })

    return NextResponse.json(period, { status: 201 })
  } catch (error) {
    console.error("Error creating payroll period:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la période" },
      { status: 500 }
    )
  }
}
