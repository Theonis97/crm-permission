import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("🔧 Correction des permissions orders...")

  // 1. Vérifier les rôles existants
  const allRoles = await prisma.role.findMany()
  console.log(`\n📋 Rôles existants: ${allRoles.map(r => r.name).join(", ")}`)

  if (allRoles.length === 0) {
    console.log("\n⚠️  Aucun rôle trouvé. Exécutez d'abord: npx prisma db seed")
    return
  }

  // 2. Créer les permissions orders
  const ordersPermissions = [
    {
      name: "orders.view",
      description: "Voir les commandes clients",
      module: "orders",
      action: "view",
    },
    {
      name: "orders.create",
      description: "Créer des commandes clients",
      module: "orders",
      action: "create",
    },
    {
      name: "orders.edit",
      description: "Modifier les commandes clients",
      module: "orders",
      action: "edit",
    },
    {
      name: "orders.delete",
      description: "Supprimer les commandes clients",
      module: "orders",
      action: "delete",
    },
    {
      name: "orders.validate",
      description: "Valider les commandes clients",
      module: "orders",
      action: "validate",
    },
    {
      name: "orders.cancel",
      description: "Annuler les commandes clients",
      module: "orders",
      action: "cancel",
    },
  ]

  console.log("\n🔐 Création des permissions...")
  for (const permission of ordersPermissions) {
    const existing = await prisma.permission.findUnique({
      where: { name: permission.name },
    })

    if (existing) {
      console.log(`  ✓ Permission "${permission.name}" existe déjà`)
    } else {
      await prisma.permission.create({
        data: permission,
      })
      console.log(`  ✨ Permission "${permission.name}" créée`)
    }
  }

  // 3. Attribuer aux rôles existants
  console.log("\n🔗 Attribution aux rôles...")

  for (const role of allRoles) {
    console.log(`\n  Rôle: ${role.name}`)
    
    // Super Admin et Admin : toutes les permissions
    let permissionsToAssign: string[] = []
    if (role.name === "Super Admin") {
      permissionsToAssign = ordersPermissions.map(p => p.name)
    } else if (role.name === "Admin" || role.name === "Manager") {
      permissionsToAssign = ["orders.view", "orders.create", "orders.edit", "orders.validate", "orders.cancel"]
    } else if (role.name === "Commercial") {
      permissionsToAssign = ["orders.view", "orders.create", "orders.edit"]
    } else {
      // Autres rôles : uniquement view
      permissionsToAssign = ["orders.view"]
    }

    for (const permName of permissionsToAssign) {
      const perm = await prisma.permission.findUnique({
        where: { name: permName },
      })

      if (perm) {
        const existing = await prisma.rolePermission.findUnique({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: perm.id,
            },
          },
        })

        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: perm.id,
            },
          })
          console.log(`    ✅ ${permName}`)
        } else {
          console.log(`    ✓ ${permName} (déjà attribué)`)
        }
      }
    }
  }

  console.log("\n✅ Permissions orders configurées avec succès !")
}

main()
  .catch((e) => {
    console.error("\n❌ Erreur:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
