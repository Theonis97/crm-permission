const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function debugSeed() {
  console.log("🔍 Diagnostic du seed...")

  try {
    // Test de connexion
    console.log("1. Test de connexion...")
    await prisma.$connect()
    console.log("✅ Connexion OK")

    // Test de création simple
    console.log("2. Test de création d'un rôle...")
    try {
      const testRole = await prisma.role.create({
        data: {
          name: "Test Role",
          description: "Test",
        },
      })
      console.log("✅ Création de rôle OK:", testRole.id)

      // Nettoyer le test
      await prisma.role.delete({
        where: { id: testRole.id },
      })
      console.log("✅ Suppression de test OK")
    } catch (error) {
      console.error("❌ Erreur lors de la création de rôle:", error.message)
    }

    // Vérifier les tables existantes
    console.log("3. Vérification des tables...")
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
    console.log("Tables trouvées:", tables)

    // Vérifier la structure de la table users
    console.log("4. Structure de la table users...")
    try {
      const userColumns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
      console.log("Colonnes users:", userColumns)
    } catch (error) {
      console.error("❌ Table users non trouvée:", error.message)
    }
  } catch (error) {
    console.error("❌ Erreur générale:", error)
  } finally {
    await prisma.$disconnect()
  }
}

debugSeed()
