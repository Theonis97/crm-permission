import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addWarehousePermissions() {
  console.log("🏭 Ajout des permissions pour le module Entrepôt...")

  try {
    // Créer les permissions pour les entrepôts
    const warehousePermissions = [
      {
        name: "warehouses.view",
        description: "Voir les entrepôts",
        module: "warehouses",
        action: "view",
      },
      {
        name: "warehouses.create",
        description: "Créer des entrepôts",
        module: "warehouses",
        action: "create",
      },
      {
        name: "warehouses.edit",
        description: "Modifier les entrepôts",
        module: "warehouses",
        action: "edit",
      },
      {
        name: "warehouses.delete",
        description: "Supprimer les entrepôts",
        module: "warehouses",
        action: "delete",
      },
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
      {
        name: "warehouses.export",
        description: "Exporter les données d'entrepôt",
        module: "warehouses",
        action: "export",
      },
    ]

    for (const permission of warehousePermissions) {
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

    // Super Admin a toutes les permissions
    if (superAdminRole) {
      for (const permission of warehousePermissions) {
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
      const adminPermissions = warehousePermissions.filter((p) => p.name !== "warehouses.delete")

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

    // Manager peut voir, gérer le stock et faire l'inventaire
    if (managerRole) {
      const managerPermissions = [
        "warehouses.view",
        "warehouses.manage_stock",
        "warehouses.inventory",
        "warehouses.export",
      ]

      for (const permissionName of managerPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permissionName },
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

    console.log("🎉 Permissions d'entrepôt ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addWarehousePermissions()
