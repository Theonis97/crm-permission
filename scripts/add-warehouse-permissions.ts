import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔧 Ajout des permissions warehouse...")

  // Permissions pour les mouvements de stock
  const movementsPermissions = [
    {
      name: "warehouse.movements.view",
      description: "Voir les mouvements de stock",
      module: "warehouse",
      action: "movements.view",
    },
    {
      name: "warehouse.movements.create",
      description: "Créer des mouvements de stock",
      module: "warehouse",
      action: "movements.create",
    },
    {
      name: "warehouse.movements.export",
      description: "Exporter les mouvements de stock",
      module: "warehouse",
      action: "movements.export",
    },
  ]

  // Permissions pour les commandes entrepôt
  const ordersPermissions = [
    {
      name: "warehouse.orders.view",
      description: "Voir les commandes entrepôt",
      module: "warehouse",
      action: "orders.view",
    },
    {
      name: "warehouse.orders.validate",
      description: "Valider les commandes entrepôt",
      module: "warehouse",
      action: "orders.validate",
    },
    {
      name: "warehouse.orders.update",
      description: "Mettre à jour les commandes",
      module: "warehouse",
      action: "orders.update",
    },
    {
      name: "warehouse.orders.cancel",
      description: "Annuler les commandes",
      module: "warehouse",
      action: "orders.cancel",
    },
  ]

  const allPermissions = [...movementsPermissions, ...ordersPermissions]

  // Créer les permissions
  for (const permission of allPermissions) {
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
    
    for (const permission of allPermissions) {
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

  console.log("\n✅ Toutes les permissions warehouse ont été ajoutées !")
}

main()
  .catch((e) => {
    console.error("❌ Erreur:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
