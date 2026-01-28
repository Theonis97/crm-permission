import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const payrollPermissions = [
  { name: "payroll.view", module: "payroll", action: "view", description: "Voir le module paie et les bulletins" },
  { name: "payroll.create", module: "payroll", action: "create", description: "Créer des bulletins de paie" },
  { name: "payroll.edit", module: "payroll", action: "edit", description: "Modifier les bulletins de paie" },
  { name: "payroll.delete", module: "payroll", action: "delete", description: "Supprimer les bulletins de paie" },
  { name: "payroll.validate", module: "payroll", action: "validate", description: "Valider les bulletins (RH)" },
  { name: "payroll.approve", module: "payroll", action: "approve", description: "Approuver les bulletins (Direction)" },
  { name: "payroll.pay", module: "payroll", action: "pay", description: "Marquer les bulletins comme payés" },
  { name: "payroll.profiles.view", module: "payroll.profiles", action: "view", description: "Voir les profils employés" },
  { name: "payroll.profiles.manage", module: "payroll.profiles", action: "manage", description: "Gérer les profils employés" },
  { name: "payroll.contributions.view", module: "payroll.contributions", action: "view", description: "Voir les cotisations" },
  { name: "payroll.contributions.manage", module: "payroll.contributions", action: "manage", description: "Gérer les cotisations" },
  { name: "payroll.adjustments.view", module: "payroll.adjustments", action: "view", description: "Voir les ajustements" },
  { name: "payroll.adjustments.manage", module: "payroll.adjustments", action: "manage", description: "Gérer les ajustements" },
  { name: "payroll.periods.view", module: "payroll.periods", action: "view", description: "Voir les périodes de paie" },
  { name: "payroll.periods.manage", module: "payroll.periods", action: "manage", description: "Gérer les périodes de paie" },
  { name: "payroll.reports", module: "payroll", action: "reports", description: "Accès aux rapports de paie" },
]

async function seedPayrollPermissions() {
  console.log("🔐 Création des permissions du module Paie...")

  // Créer les permissions
  for (const perm of payrollPermissions) {
    const existing = await prisma.permission.findFirst({
      where: { name: perm.name },
    })

    if (!existing) {
      await prisma.permission.create({
        data: {
          name: perm.name,
          module: perm.module,
          action: perm.action,
          description: perm.description,
        },
      })
      console.log(`  ✅ Permission créée: ${perm.name}`)
    } else {
      console.log(`  ⏭️  Permission existe déjà: ${perm.name}`)
    }
  }

  console.log("\n👥 Attribution des permissions aux rôles Super Admin et Admin...")

  // Trouver les rôles Super Admin et Admin
  const superAdminRole = await prisma.role.findFirst({
    where: {
      OR: [
        { name: { contains: "super", mode: "insensitive" } },
        { name: { contains: "superadmin", mode: "insensitive" } },
        { name: { equals: "Super Admin", mode: "insensitive" } },
      ],
    },
  })

  const adminRole = await prisma.role.findFirst({
    where: {
      AND: [
        { name: { contains: "admin", mode: "insensitive" } },
        { NOT: { name: { contains: "super", mode: "insensitive" } } },
      ],
    },
  })

  // Récupérer toutes les permissions payroll
  const permissions = await prisma.permission.findMany({
    where: {
      name: { startsWith: "payroll." },
    },
  })

  if (superAdminRole) {
    console.log(`  📌 Rôle Super Admin trouvé: ${superAdminRole.name} (${superAdminRole.id})`)
    
    // Attribuer toutes les permissions au Super Admin via RolePermission
    for (const perm of permissions) {
      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      })
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: superAdminRole.id,
            permissionId: perm.id,
          },
        })
      }
    }
    console.log(`  ✅ ${permissions.length} permissions attribuées au Super Admin`)
  } else {
    console.log("  ⚠️  Rôle Super Admin non trouvé")
  }

  if (adminRole) {
    console.log(`  📌 Rôle Admin trouvé: ${adminRole.name} (${adminRole.id})`)
    
    // Attribuer toutes les permissions au Admin via RolePermission
    for (const perm of permissions) {
      const existing = await prisma.rolePermission.findFirst({
        where: {
          roleId: adminRole.id,
          permissionId: perm.id,
        },
      })
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: perm.id,
          },
        })
      }
    }
    console.log(`  ✅ ${permissions.length} permissions attribuées au Admin`)
  } else {
    console.log("  ⚠️  Rôle Admin non trouvé")
  }

  // Afficher tous les rôles disponibles si aucun n'a été trouvé
  if (!superAdminRole && !adminRole) {
    console.log("\n📋 Rôles disponibles dans la base de données:")
    const allRoles = await prisma.role.findMany({
      select: { id: true, name: true },
    })
    allRoles.forEach((role) => {
      console.log(`  - ${role.name} (${role.id})`)
    })
  }

  console.log("\n✅ Script terminé!")
}

async function main() {
  try {
    await seedPayrollPermissions()
  } catch (error) {
    console.error("❌ Erreur:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
