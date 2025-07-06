const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function addOpportunityPermissions() {
  try {
    console.log("🔧 Ajout des permissions pour les opportunités...")

    // Permissions pour les opportunités
    const opportunityPermissions = [
      {
        name: "opportunities.view",
        description: "Voir ses propres opportunités et celles où il est participant",
      },
      {
        name: "opportunities.view_all",
        description: "Voir toutes les opportunités",
      },
      {
        name: "opportunities.create",
        description: "Créer des opportunités",
      },
      {
        name: "opportunities.edit",
        description: "Modifier les opportunités",
      },
      {
        name: "opportunities.delete",
        description: "Supprimer les opportunités",
      },
    ]

    // Créer les permissions
    for (const permission of opportunityPermissions) {
      await prisma.permission.upsert({
        where: { name: permission.name },
        update: { description: permission.description },
        create: permission,
      })
      console.log(`✅ Permission créée: ${permission.name}`)
    }

    // Assigner les permissions aux rôles
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
      for (const permission of opportunityPermissions) {
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
      console.log("✅ Permissions assignées au rôle admin")
    }

    if (managerRole) {
      // Manager peut voir toutes les opportunités et les gérer
      const managerPermissions = ["opportunities.view_all", "opportunities.create", "opportunities.edit"]

      for (const permName of managerPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
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
      console.log("✅ Permissions assignées au rôle manager")
    }

    if (userRole) {
      // User peut voir ses propres opportunités et en créer
      const userPermissions = ["opportunities.view", "opportunities.create"]

      for (const permName of userPermissions) {
        const perm = await prisma.permission.findUnique({
          where: { name: permName },
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
      console.log("✅ Permissions assignées au rôle user")
    }

    console.log("🎉 Permissions des opportunités ajoutées avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addOpportunityPermissions()
