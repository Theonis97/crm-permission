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

    // Vérifier les permissions par module
    const modules = [
      { name: "produits", prefix: "products.", icon: "📦" },
      { name: "entrepôts", prefix: "warehouses.", icon: "🏭" },
      { name: "magasins", prefix: "stores.", icon: "🏪" },
      { name: "ventes", prefix: "quotes.", icon: "💰" },
      { name: "tâches", prefix: "tasks.", icon: "✅" },
    ]

    for (const module of modules) {
      console.log(`\n${module.icon} Vérification des permissions ${module.name}...`)

      const modulePermissions = await prisma.permission.findMany({
        where: {
          name: {
            startsWith: module.prefix,
          },
        },
      })

      console.log(`   Permissions trouvées: ${modulePermissions.length}`)
      modulePermissions.forEach((perm) => {
        console.log(`   - ${perm.name}: ${perm.description}`)
      })

      // Vérifier les rôles avec ces permissions
      const rolesWithModulePermissions = await prisma.role.findMany({
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
            where: {
              permission: {
                name: {
                  startsWith: module.prefix,
                },
              },
            },
          },
        },
      })

      const rolesWithPerms = rolesWithModulePermissions.filter((r) => r.rolePermissions.length > 0)
      console.log(`   Rôles avec accès: ${rolesWithPerms.length}`)
      for (const role of rolesWithPerms) {
        console.log(`      - ${role.name}: ${role.rolePermissions.length} permissions`)
      }
    }
  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPermissions()
