const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function verifySetup() {
  try {
    console.log("🔍 Vérification de la configuration...")

    // Vérifier la connexion
    await prisma.$connect()
    console.log("✅ Connexion à la base de données OK")

    // Compter les enregistrements
    const counts = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      userRoles: await prisma.userRole.count(),
      rolePermissions: await prisma.rolePermission.count(),
    }

    console.log("\n📊 Statistiques:")
    console.log(`   Utilisateurs: ${counts.users}`)
    console.log(`   Rôles: ${counts.roles}`)
    console.log(`   Permissions: ${counts.permissions}`)
    console.log(`   Assignations utilisateur-rôle: ${counts.userRoles}`)
    console.log(`   Assignations rôle-permission: ${counts.rolePermissions}`)

    // Vérifier l'utilisateur admin
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
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

    if (adminUser) {
      console.log("\n👤 Utilisateur admin trouvé:")
      console.log(`   Email: ${adminUser.email}`)
      console.log(`   Nom: ${adminUser.firstName} ${adminUser.lastName}`)

      const permissions = new Set()
      adminUser.userRoles.forEach((ur) => {
        console.log(`   Rôle: ${ur.role.name}`)
        ur.role.rolePermissions.forEach((rp) => {
          permissions.add(rp.permission.name)
        })
      })

      console.log(`   Permissions totales: ${permissions.size}`)
    } else {
      console.log("❌ Utilisateur admin non trouvé!")
    }

    console.log("\n🎉 Configuration vérifiée avec succès!")
  } catch (error) {
    console.error("❌ Erreur lors de la vérification:", error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySetup()
