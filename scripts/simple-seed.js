const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
})

async function simpleSeed() {
  console.log("🌱 Seed simplifié...")

  try {
    await prisma.$connect()
    console.log("✅ Connexion établie")

    // Étape 1: Créer un rôle simple
    console.log("1. Création d'un rôle...")
    const role = await prisma.role.create({
      data: {
        name: "Admin Test",
        description: "Rôle de test",
        isSystem: true,
      },
    })
    console.log("✅ Rôle créé:", role)

    // Étape 2: Créer une permission simple
    console.log("2. Création d'une permission...")
    const permission = await prisma.permission.create({
      data: {
        name: "test.view",
        description: "Permission de test",
        module: "test",
        action: "view",
      },
    })
    console.log("✅ Permission créée:", permission)

    // Étape 3: Lier rôle et permission
    console.log("3. Liaison rôle-permission...")
    const rolePermission = await prisma.rolePermission.create({
      data: {
        roleId: role.id,
        permissionId: permission.id,
      },
    })
    console.log("✅ Liaison créée:", rolePermission)

    // Étape 4: Créer un utilisateur
    console.log("4. Création d'un utilisateur...")
    const hashedPassword = await bcrypt.hash("password", 12)
    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        name: "Test User",
        password: hashedPassword,
        status: "ACTIVE",
      },
    })
    console.log("✅ Utilisateur créé:", user)

    // Étape 5: Assigner le rôle à l'utilisateur
    console.log("5. Attribution du rôle...")
    const userRole = await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    })
    console.log("✅ Rôle assigné:", userRole)

    // Vérification finale
    console.log("6. Vérification...")
    const counts = {
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      userRoles: await prisma.userRole.count(),
      rolePermissions: await prisma.rolePermission.count(),
    }
    console.log("📊 Résultats:", counts)

    console.log("🎉 Seed simplifié réussi!")
  } catch (error) {
    console.error("❌ Erreur:", error)
    console.error("Stack:", error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

simpleSeed()
