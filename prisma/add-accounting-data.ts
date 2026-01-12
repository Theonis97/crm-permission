import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Ajout des données du module comptabilité...")

  try {
    // 1. Ajouter les permissions comptabilité (si elles n'existent pas)
    console.log("🔐 Ajout des permissions comptabilité...")
    const accountingPermissions = [
      { name: "accounting.view", description: "Voir la comptabilité", module: "accounting", action: "view" },
      { name: "accounting.dashboard", description: "Voir le tableau de bord comptable", module: "accounting", action: "dashboard" },
      { name: "accounting.expenses.view", description: "Voir les dépenses", module: "accounting", action: "view" },
      { name: "accounting.expenses.create", description: "Créer des dépenses", module: "accounting", action: "create" },
      { name: "accounting.expenses.edit", description: "Modifier les dépenses", module: "accounting", action: "edit" },
      { name: "accounting.expenses.delete", description: "Supprimer les dépenses", module: "accounting", action: "delete" },
      { name: "accounting.expenses.pay", description: "Enregistrer des paiements", module: "accounting", action: "pay" },
      { name: "accounting.categories.view", description: "Voir les catégories de dépenses", module: "accounting", action: "view" },
      { name: "accounting.categories.manage", description: "Gérer les catégories de dépenses", module: "accounting", action: "manage" },
      { name: "accounting.reports.view", description: "Voir les rapports comptables", module: "accounting", action: "view" },
      { name: "accounting.reports.export", description: "Exporter les rapports comptables", module: "accounting", action: "export" },
    ]

    let permissionsCreated = 0
    for (const permission of accountingPermissions) {
      const existing = await prisma.permission.findUnique({
        where: { name: permission.name }
      })
      
      if (!existing) {
        await prisma.permission.create({ data: permission })
        permissionsCreated++
        console.log(`   ✅ Permission créée: ${permission.name}`)
      } else {
        console.log(`   ⏭️  Permission existe déjà: ${permission.name}`)
      }
    }
    console.log(`✅ ${permissionsCreated} nouvelle(s) permission(s) créée(s)`)

    // 2. Assigner les permissions au rôle Super Admin
    console.log("\n🎭 Assignation des permissions au Super Admin...")
    const superAdminRole = await prisma.role.findFirst({
      where: { name: "Super Admin" }
    })

    if (superAdminRole) {
      const allAccountingPermissions = await prisma.permission.findMany({
        where: { name: { startsWith: "accounting." } }
      })

      let assignmentsCreated = 0
      for (const permission of allAccountingPermissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: {
            roleId: superAdminRole.id,
            permissionId: permission.id
          }
        })

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: superAdminRole.id,
              permissionId: permission.id
            }
          })
          assignmentsCreated++
        }
      }
      console.log(`✅ ${assignmentsCreated} permission(s) assignée(s) au Super Admin`)
    } else {
      console.log("⚠️  Rôle Super Admin non trouvé")
    }

    // 3. Assigner les permissions au rôle Admin (si existe)
    const adminRole = await prisma.role.findFirst({
      where: { name: "Admin" }
    })

    if (adminRole) {
      const adminPermissions = await prisma.permission.findMany({
        where: { 
          name: { 
            in: [
              "accounting.view",
              "accounting.dashboard",
              "accounting.expenses.view",
              "accounting.expenses.create",
              "accounting.expenses.edit",
              "accounting.expenses.pay",
              "accounting.categories.view",
              "accounting.reports.view",
            ]
          }
        }
      })

      let adminAssignments = 0
      for (const permission of adminPermissions) {
        const existing = await prisma.rolePermission.findFirst({
          where: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        })

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          })
          adminAssignments++
        }
      }
      console.log(`✅ ${adminAssignments} permission(s) assignée(s) au rôle Admin`)
    }

    // 4. Ajouter les catégories de dépenses par défaut
    console.log("\n💰 Ajout des catégories de dépenses...")
    const expenseCategories = [
      { name: "Achat Fournisseur", description: "Achats auprès des fournisseurs", icon: "Package", color: "#3B82F6", isSystem: true },
      { name: "Salaire", description: "Salaires des employés", icon: "Users", color: "#10B981", isSystem: true },
      { name: "Transport", description: "Frais de transport et déplacement", icon: "Truck", color: "#F59E0B", isSystem: true },
      { name: "Internet", description: "Abonnement internet", icon: "Wifi", color: "#8B5CF6", isSystem: true },
      { name: "Loyer", description: "Loyer des locaux", icon: "Home", color: "#EF4444", isSystem: true },
      { name: "Électricité", description: "Factures d'électricité", icon: "Zap", color: "#F97316", isSystem: true },
      { name: "Eau", description: "Factures d'eau", icon: "Droplet", color: "#06B6D4", isSystem: true },
      { name: "Prestation", description: "Prestations de services", icon: "Briefcase", color: "#6366F1", isSystem: true },
      { name: "Impôts & Taxes", description: "Impôts et taxes diverses", icon: "FileText", color: "#DC2626", isSystem: true },
      { name: "Assurance", description: "Assurances diverses", icon: "Shield", color: "#059669", isSystem: true },
      { name: "Autre", description: "Autres dépenses", icon: "MoreHorizontal", color: "#6B7280", isSystem: true },
    ]

    let categoriesCreated = 0
    for (const category of expenseCategories) {
      const existing = await prisma.expenseCategory.findUnique({
        where: { name: category.name }
      })

      if (!existing) {
        await prisma.expenseCategory.create({ data: category })
        categoriesCreated++
        console.log(`   ✅ Catégorie créée: ${category.name}`)
      } else {
        console.log(`   ⏭️  Catégorie existe déjà: ${category.name}`)
      }
    }
    console.log(`✅ ${categoriesCreated} nouvelle(s) catégorie(s) créée(s)`)

    // 5. Résumé
    console.log("\n📊 Résumé:")
    const counts = {
      permissions: await prisma.permission.count({ where: { name: { startsWith: "accounting." } } }),
      categories: await prisma.expenseCategory.count(),
    }
    console.log(`   Permissions comptabilité: ${counts.permissions}`)
    console.log(`   Catégories de dépenses: ${counts.categories}`)

    console.log("\n🎉 Module comptabilité initialisé avec succès!")

  } catch (error) {
    console.error("❌ Erreur:", error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
