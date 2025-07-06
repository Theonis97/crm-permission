import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addTaskPermissions() {
  console.log("🔧 Ajout des permissions pour le module Tâches...")

  try {
    // Créer les permissions pour les tâches
    const taskPermissions = [
      {
        name: "tasks.view",
        description: "Voir les tâches",
      },
      {
        name: "tasks.create",
        description: "Créer des tâches",
      },
      {
        name: "tasks.edit",
        description: "Modifier les tâches",
      },
      {
        name: "tasks.delete",
        description: "Supprimer les tâches",
      },
      {
        name: "tasks.assign",
        description: "Assigner des tâches",
      },
    ]

    for (const permission of taskPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: permission,
      })
      console.log(`✅ Permission créée: ${permission.name}`)
    }

    // Assigner les permissions aux rôles existants
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" },
    })

    const managerRole = await prisma.role.findUnique({
      where: { name: "manager" },
    })

    const userRole = await prisma.role.findUnique({
      where: { name: "user" },
    })

    if (adminRole) {
      // Admin a toutes les permissions
      for (const permission of taskPermissions) {
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

    if (managerRole) {
      // Manager a toutes les permissions sauf delete
      const managerPermissions = taskPermissions.filter((p) => p.name !== "tasks.delete")

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

    if (userRole) {
      // User peut seulement voir et créer
      const userPermissions = ["tasks.view", "tasks.create"]

      for (const permissionName of userPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permissionName },
        })

        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: userRole.id,
                permissionId: perm.id,
              },
            },
            update: {},
            create: {
              roleId: userRole.id,
              permissionId: perm.id,
            },
          })
        }
      }
      console.log("✅ Permissions assignées au rôle User")
    }

    console.log("🎉 Permissions des tâches ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addTaskPermissions()
