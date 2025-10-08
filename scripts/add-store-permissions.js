import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addStorePermissions() {
  console.log("🏪 Ajout des permissions pour le module Magasins...")

  try {
    // Créer les permissions pour les magasins
    const storePermissions = [
      {
        name: "stores.view",
        description: "Voir les magasins",
        module: "stores",
        action: "view",
      },
      {
        name: "stores.create",
        description: "Créer des magasins",
        module: "stores",
        action: "create",
      },
      {
        name: "stores.edit",
        description: "Modifier les magasins",
        module: "stores",
        action: "edit",
      },
      {
        name: "stores.delete",
        description: "Supprimer les magasins",
        module: "stores",
        action: "delete",
      },
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
      {
        name: "stores.view_sales",
        description: "Voir les ventes du magasin",
        module: "stores",
        action: "view_sales",
      },
      {
        name: "stores.export",
        description: "Exporter les données du magasin",
        module: "stores",
        action: "export",
      },
    ]

    for (const permission of storePermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { 
          description: permission.description,
          module: permission.module,
          action: permission.action,
        },
        create: permission,
      })
      console.log(`✅ Permission créée: ${permission.name}`)
    }

    // Assigner les permissions aux rôles existants
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

    // Super Admin a toutes les permissions
    if (superAdminRole) {
      for (const permission of storePermissions) {
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
        }
      }
      console.log("✅ Permissions assignées au rôle Super Admin")
    }

    // Admin a toutes les permissions sauf delete
    if (adminRole) {
      const adminPermissions = storePermissions.filter((p) => p.name !== "stores.delete")

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
        }
      }
      console.log("✅ Permissions assignées au rôle Admin")
    }

    // Manager peut tout faire sauf supprimer
    if (managerRole) {
      const managerPermissions = storePermissions.filter((p) => p.name !== "stores.delete")

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
        }
      }
      console.log("✅ Permissions assignées au rôle Manager")
    }

    // Commercial peut voir les magasins et les ventes
    if (commercialRole) {
      const commercialPermissions = [
        "stores.view",
        "stores.view_sales",
      ]

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
        }
      }
      console.log("✅ Permissions assignées au rôle Commercial")
    }

    console.log("🎉 Permissions de magasins ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addStorePermissions()
