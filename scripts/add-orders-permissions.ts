import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔧 Ajout des permissions orders...")

  const ordersPermissions = [
    {
      name: "orders.create",
      description: "Créer des commandes",
      module: "orders",
      action: "create",
    },
    {
      name: "orders.view",
      description: "Voir les commandes",
      module: "orders",
      action: "view",
    },
    {
      name: "orders.edit",
      description: "Modifier les commandes",
      module: "orders",
      action: "edit",
    },
    {
      name: "orders.delete",
      description: "Supprimer les commandes",
      module: "orders",
      action: "delete",
    },
  ]

  // Créer les permissions
  for (const permission of ordersPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: permission.name },
    })

    if (existing) {
      console.log(`✅ Permission "${permission.name}" existe déjà`)
    } else {
      await prisma.permission.create({
        data: permission,
      })
      console.log(`✨ Permission "${permission.name}" créée`)
    }
  }

  // Assigner toutes les permissions au rôle Super Admin
  const superAdminRole = await prisma.role.findUnique({
    where: { name: "Super Admin" },
  })

  if (superAdminRole) {
    console.log("\n🔐 Attribution des permissions au rôle Super Admin...")
    
    for (const permission of ordersPermissions) {
      const perm = await prisma.permission.findUnique({
        where: { name: permission.name },
      })

      if (perm) {
        const existing = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: perm.id,
            },
          },
        })

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: superAdminRole.id,
              permissionId: perm.id,
            },
          })
          console.log(`✅ Permission "${permission.name}" attribuée à Super Admin`)
        }
      }
    }
  }

  console.log("\n✅ Toutes les permissions orders ont été ajoutées !")
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
