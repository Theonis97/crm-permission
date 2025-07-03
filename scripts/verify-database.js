const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function verifyDatabase() {
  try {
    console.log("🔍 Vérification de la base de données...")

    // Test de connexion
    await prisma.$connect()
    console.log("✅ Connexion réussie")

    // Compter les enregistrements
    const counts = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      userRoles: await prisma.userRole.count(),
      rolePermissions: await prisma.rolePermission.count(),
    }

    console.log("\n📊 Statistiques:")
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`)
    })

    // Vérifier les utilisateurs et leurs rôles
    console.log("\n👥 Utilisateurs et rôles:")
    const usersWithRoles = await prisma.user.findMany({
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    })

    usersWithRoles.forEach((user) => {
      const roles = user.userRoles.map((ur) => ur.role.name).join(", ")
      console.log(`   ${user.email} -> ${roles}`)
    })

    // Vérifier les permissions par rôle
    console.log("\n🔐 Permissions par rôle:")
    const rolesWithPermissions = await prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    rolesWithPermissions.forEach((role) => {
      console.log(`   ${role.name}: ${role.rolePermissions.length} permissions`)
    })

    if (counts.users === 0) {
      console.log("\n❌ Aucun utilisateur trouvé! Le seed n'a pas fonctionné.")
      return false
    }

    console.log("\n🎉 Base de données correctement configurée!")
    return true
  } catch (error) {
    console.error("❌ Erreur:", error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

verifyDatabase()
