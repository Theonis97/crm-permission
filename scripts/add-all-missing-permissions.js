import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addAllMissingPermissions() {
  console.log("🔧 Ajout de toutes les permissions manquantes...")

  try {
    // Définir toutes les permissions
    const allPermissions = [
      // Warehouses management (Entrepôts)
      { name: "warehouses.view", description: "Voir les entrepôts", module: "warehouses", action: "view" },
      { name: "warehouses.create", description: "Créer des entrepôts", module: "warehouses", action: "create" },
      { name: "warehouses.edit", description: "Modifier les entrepôts", module: "warehouses", action: "edit" },
      { name: "warehouses.delete", description: "Supprimer les entrepôts", module: "warehouses", action: "delete" },
      {
        name: "warehouses.manage_stock",
        description: "Gérer les stocks dans les entrepôts",
        module: "warehouses",
        action: "manage_stock",
      },
      {
        name: "warehouses.transfer",
        description: "Transférer des stocks entre entrepôts",
        module: "warehouses",
        action: "transfer",
      },
      {
        name: "warehouses.inventory",
        description: "Faire l'inventaire des entrepôts",
        module: "warehouses",
        action: "inventory",
      },
      { name: "warehouses.export", description: "Exporter les données d'entrepôt", module: "warehouses", action: "export" },

      // Stores management (Magasins)
      { name: "stores.view", description: "Voir les magasins", module: "stores", action: "view" },
      { name: "stores.create", description: "Créer des magasins", module: "stores", action: "create" },
      { name: "stores.edit", description: "Modifier les magasins", module: "stores", action: "edit" },
      { name: "stores.delete", description: "Supprimer les magasins", module: "stores", action: "delete" },
      {
        name: "stores.assign_manager",
        description: "Assigner un gestionnaire au magasin",
        module: "stores",
        action: "assign_manager",
      },
      {
        name: "stores.manage_inventory",
        description: "Gérer l'inventaire du magasin",
        module: "stores",
        action: "manage_inventory",
      },
      { name: "stores.view_sales", description: "Voir les ventes du magasin", module: "stores", action: "view_sales" },
      { name: "stores.export", description: "Exporter les données du magasin", module: "stores", action: "export" },
    ]

    console.log(`\n📦 Création/Mise à jour de ${allPermissions.length} permissions...`)

    // Créer ou mettre à jour chaque permission
    for (const permission of allPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: {
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
        create: permission,
      })
      console.log(`✅ ${permission.name}`)
    }

    // Récupérer les rôles
    console.log("\n🎭 Attribution des permissions aux rôles...")

    const superAdminRole = await prisma.role.findUnique({
      where: { name: "Super Admin" },
    })

    const adminRole = await prisma.role.findUnique({
      where: { name: "Admin" },
    })

    const managerRole = await prisma.role.findUnique({
      where: { name: "Manager" },
    })

    const commercialRole = await prisma.role.findUnique({
      where: { name: "Commercial" },
    })

    // Super Admin : toutes les permissions
    if (superAdminRole) {
      let count = 0
      for (const permission of allPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permission.name },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: superAdminRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: superAdminRole.id,
              permissionId: perm.id,
            },
          })
          count++
        }
      }
      console.log(`✅ Super Admin: ${count} permissions`)
    }

    // Admin : toutes sauf delete
    if (adminRole) {
      let count = 0
      const adminPermissions = allPermissions.filter((p) => !p.name.endsWith(".delete"))

      for (const permission of adminPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permission.name },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: adminRole.id,
              permissionId: perm.id,
            },
          })
          count++
        }
      }
      console.log(`✅ Admin: ${count} permissions`)
    }

    // Manager : toutes sauf delete
    if (managerRole) {
      let count = 0
      const managerPermissions = allPermissions.filter((p) => !p.name.endsWith(".delete"))

      for (const permission of managerPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permission.name },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: managerRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: managerRole.id,
              permissionId: perm.id,
            },
          })
          count++
        }
      }
      console.log(`✅ Manager: ${count} permissions`)
    }

    // Commercial : seulement vue et ventes pour les magasins
    if (commercialRole) {
      let count = 0
      const commercialPermissions = ["stores.view", "stores.view_sales"]

      for (const permissionName of commercialPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permissionName },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: commercialRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: commercialRole.id,
              permissionId: perm.id,
            },
          })
          count++
        }
      }
      console.log(`✅ Commercial: ${count} permissions`)
    }

    // Afficher un résumé
    console.log("\n📊 Résumé:")
    const warehouseCount = await prisma.permission.count({
      where: { module: "warehouses" },
    })
    const storeCount = await prisma.permission.count({
      where: { module: "stores" },
    })
    const totalCount = await prisma.permission.count()

    console.log(`   Permissions Entrepôt: ${warehouseCount}`)
    console.log(`   Permissions Magasins: ${storeCount}`)
    console.log(`   Total permissions: ${totalCount}`)

    console.log("\n🎉 Toutes les permissions ont été ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

addAllMissingPermissions()
