import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔐 Ajout de la permission accounting.manage...")

  // Créer la permission si elle n'existe pas
  const permission = await prisma.permission.upsert({
    where: { name: "accounting.manage" },
    update: {},
    create: {
      name: "accounting.manage",
      description: "Gérer la comptabilité (recettes journalières, dépenses)",
      module: "accounting",
      action: "manage",
    },
  })

  console.log(`✅ Permission créée/existante: ${permission.name}`)

  // Assigner cette permission au rôle Super Admin
  const superAdminRole = await prisma.role.findFirst({
    where: { name: "Super Admin" },
  })

  if (superAdminRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    })
    console.log(`✅ Permission assignée au rôle Super Admin`)
  }

  // Assigner aussi au rôle Admin
  const adminRole = await prisma.role.findFirst({
    where: { name: "Admin" },
  })

  if (adminRole) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    })
    console.log(`✅ Permission assignée au rôle Admin`)
  }

  console.log("🎉 Terminé!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
