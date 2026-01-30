import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les paramètres de l'entreprise
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    // Récupérer les paramètres (il n'y en a qu'un seul enregistrement)
    const settings = await prisma.payrollCompanySettings.findFirst({
      include: {
        updatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error fetching company settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des paramètres" },
      { status: 500 }
    )
  }
}

// POST - Créer ou mettre à jour les paramètres de l'entreprise
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()

    const {
      companyName,
      companyAddress,
      companyCity,
      companyPostalCode,
      companyCountry,
      rccmNumber,
      nifNumber,
      cnssEmployerNumber,
      companyPhone,
      companyEmail,
      companyWebsite,
      companyLogo,
      conventionCollective,
      codeApe,
    } = body

    // Validation des champs obligatoires
    if (!companyName || !companyAddress || !companyCity) {
      return NextResponse.json(
        { error: "Raison sociale, adresse et ville sont obligatoires" },
        { status: 400 }
      )
    }

    // Vérifier s'il existe déjà des paramètres
    const existing = await prisma.payrollCompanySettings.findFirst()

    let settings

    if (existing) {
      // Mettre à jour
      settings = await prisma.payrollCompanySettings.update({
        where: { id: existing.id },
        data: {
          companyName,
          companyAddress,
          companyCity,
          companyPostalCode,
          companyCountry: companyCountry || "Gabon",
          rccmNumber,
          nifNumber,
          cnssEmployerNumber,
          companyPhone,
          companyEmail,
          companyWebsite,
          companyLogo,
          conventionCollective,
          codeApe,
          updatedById: session?.user?.id,
        },
        include: {
          updatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })
    } else {
      // Créer
      settings = await prisma.payrollCompanySettings.create({
        data: {
          companyName,
          companyAddress,
          companyCity,
          companyPostalCode,
          companyCountry: companyCountry || "Gabon",
          rccmNumber,
          nifNumber,
          cnssEmployerNumber,
          companyPhone,
          companyEmail,
          companyWebsite,
          companyLogo,
          conventionCollective,
          codeApe,
          updatedById: session?.user?.id,
        },
        include: {
          updatedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              name: true,
            },
          },
        },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error("Error saving company settings:", error)
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde des paramètres" },
      { status: 500 }
    )
  }
}
