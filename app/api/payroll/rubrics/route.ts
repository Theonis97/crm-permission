import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/payroll/rubrics - Liste des rubriques de paie
export async function GET(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // PRIME ou INDEMNITY
    const category = searchParams.get("category")
    const isActive = searchParams.get("isActive")

    const where: any = {}

    if (type) {
      where.type = type
    }

    if (category) {
      where.category = category
    }

    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === "true"
    }

    const rubrics = await prisma.payrollRubric.findMany({
      where,
      orderBy: [
        { type: "asc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
      include: {
        _count: {
          select: {
            employeeRubrics: true,
            rubricLines: true,
          },
        },
      },
    })

    // Récupérer les catégories distinctes
    const categories = await prisma.payrollRubric.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    })

    return NextResponse.json({
      rubrics,
      categories: categories.map((c) => c.category).filter(Boolean),
    })
  } catch (error) {
    console.error("[PAYROLL_RUBRICS_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des rubriques" },
      { status: 500 }
    )
  }
}

// POST /api/payroll/rubrics - Créer une rubrique
export async function POST(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const {
      code,
      name,
      description,
      type,
      isSubjectToTax,
      isSubjectToSocial,
      calculationBase,
      defaultAmount,
      defaultRate,
      exemptionCeiling,
      displayOrder,
      category,
    } = body

    // Validation
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "Code, nom et type sont requis" },
        { status: 400 }
      )
    }

    if (!["PRIME", "INDEMNITY"].includes(type)) {
      return NextResponse.json(
        { error: "Type invalide. Doit être PRIME ou INDEMNITY" },
        { status: 400 }
      )
    }

    // Vérifier l'unicité du code
    const existingRubric = await prisma.payrollRubric.findUnique({
      where: { code },
    })

    if (existingRubric) {
      return NextResponse.json(
        { error: "Ce code de rubrique existe déjà" },
        { status: 400 }
      )
    }

    const rubric = await prisma.payrollRubric.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        type,
        isSubjectToTax: isSubjectToTax ?? true,
        isSubjectToSocial: isSubjectToSocial ?? true,
        calculationBase: calculationBase || "FIXED",
        defaultAmount,
        defaultRate,
        exemptionCeiling,
        displayOrder: displayOrder || 0,
        category,
      },
    })

    console.log(`✅ Rubrique créée: ${rubric.code} - ${rubric.name}`)

    return NextResponse.json(rubric, { status: 201 })
  } catch (error) {
    console.error("[PAYROLL_RUBRICS_POST]", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la rubrique" },
      { status: 500 }
    )
  }
}
