const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function resetSchema() {
  console.log("🔄 Reset du schéma...")

  try {
    await prisma.$connect()

    // Supprimer toutes les tables dans l'ordre correct
    console.log("1. Suppression des tables existantes...")

    await prisma.$executeRaw`DROP TABLE IF EXISTS "role_permissions" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "user_roles" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "permissions" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "roles" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Session" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "Account" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "VerificationToken" CASCADE;`
    await prisma.$executeRaw`DROP TABLE IF EXISTS "users" CASCADE;`

    // Supprimer le type enum s'il existe
    await prisma.$executeRaw`DROP TYPE IF EXISTS "UserStatus" CASCADE;`

    console.log("✅ Tables supprimées")

    console.log("2. Recréation du schéma avec Prisma...")
    // Maintenant on peut faire un push propre
  } catch (error) {
    console.error("❌ Erreur:", error)
  } finally {
    await prisma.$disconnect()
  }
}

resetSchema()
