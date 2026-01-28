import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function seedPayrollContributions() {
  console.log("🌱 Seeding payroll contributions...")

  const contributions = [
    // Cotisations salariales (part employé)
    {
      name: "CNSS Salariale",
      code: "CNSS_SAL",
      description: "Cotisation CNSS part salariale",
      isEmployeeShare: true,
      isEmployerShare: false,
      rate: 2.5,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 1,
    },
    {
      name: "IRPP",
      code: "IRPP",
      description: "Impôt sur le Revenu des Personnes Physiques",
      isEmployeeShare: true,
      isEmployerShare: false,
      rate: 5.0,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 2,
    },
    {
      name: "Taxe Communale",
      code: "TAX_COM",
      description: "Taxe communale sur les salaires",
      isEmployeeShare: true,
      isEmployerShare: false,
      rate: 1.0,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 3,
    },
    // Cotisations patronales (part employeur)
    {
      name: "CNSS Patronale",
      code: "CNSS_PAT",
      description: "Cotisation CNSS part patronale",
      isEmployeeShare: false,
      isEmployerShare: true,
      rate: 16.0,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 10,
    },
    {
      name: "Taxe d'Apprentissage",
      code: "TAX_APP",
      description: "Taxe d'apprentissage",
      isEmployeeShare: false,
      isEmployerShare: true,
      rate: 1.2,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 11,
    },
    {
      name: "Contribution Formation",
      code: "CONTRIB_FORM",
      description: "Contribution à la formation professionnelle",
      isEmployeeShare: false,
      isEmployerShare: true,
      rate: 0.5,
      ceiling: null,
      declaredOnly: true,
      displayOrder: 12,
    },
  ]

  for (const contribution of contributions) {
    const existing = await prisma.payrollContribution.findFirst({
      where: { code: contribution.code },
    })

    if (!existing) {
      await prisma.payrollContribution.create({
        data: contribution,
      })
      console.log(`  ✅ Created: ${contribution.name}`)
    } else {
      console.log(`  ⏭️  Skipped (exists): ${contribution.name}`)
    }
  }

  console.log("✅ Payroll contributions seeded successfully!")
}

async function main() {
  try {
    await seedPayrollContributions()
  } catch (error) {
    console.error("Error seeding payroll data:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
