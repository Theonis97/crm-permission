import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function checkPermissions() {
  try {
    console.log("🔍 Vérification des permissions...")

    // Vérifier les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    console.log(`\n👥 Utilisateurs trouvés: ${users.length}`)

    for (const user of users) {
      console.log(`\n📧 ${user.email} (ID: ${user.id})`)
      console.log(`   Rôles: ${user.userRoles.length}`)

      for (const userRole of user.userRoles) {
        console.log(`   - ${userRole.role.name}`)
        console.log(`     Permissions: ${userRole.role.rolePermissions.length}`)

        for (const rolePermission of userRole.role.rolePermissions) {
          console.log(`     * ${rolePermission.permission.name}`)
        }
      }
    }

    // Vérifier les permissions produits spécifiquement
    console.log("\n🔍 Vérification des permissions produits...")

    const productPermissions = await prisma.permission.findMany({
      where: {
        name: {
          startsWith: "products.",
        },
      },
    })

    console.log(`\n📦 Permissions produits trouvées: ${productPermissions.length}`)
    productPermissions.forEach((perm) => {
      console.log(`   - ${perm.name}: ${perm.description}`)
    })

    // Vérifier les rôles avec permissions produits
    const rolesWithProductPermissions = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
          where: {
            permission: {
              name: {
                startsWith: "products.",
              },
            },
          },
        },
      },
    })

    console.log(`\n🛡️ Rôles avec permissions produits: ${rolesWithProductPermissions.length}`)
    for (const role of rolesWithProductPermissions) {
      console.log(`   - ${role.name}: ${role.rolePermissions.length} permissions produits`)
    }
  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPermissions()
