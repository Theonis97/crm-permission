import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addSavPermissions() {
  console.log("🔧 Ajout des permissions SAV (Service Après-Vente)...")

  try {
    // 1. Créer les permissions SAV
    console.log("🔐 Création des permissions SAV...")
    
    const savPermissionsData = [
      { name: "store.sav.view", description: "Voir les retours SAV", module: "sav", action: "view" },
      { name: "store.sav.create", description: "Créer des retours SAV", module: "sav", action: "create" },
      { name: "store.sav.process", description: "Traiter les retours SAV (approuver, rembourser, rejeter)", module: "sav", action: "process" },
    ]

    // Créer les permissions SAV
    const savPermissions = await Promise.all(
      savPermissionsData.map((permission) =>
        prisma.storePermission.upsert({
          where: { name: permission.name },
          update: {
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
          create: permission,
        })
      )
    )

    console.log(`✅ ${savPermissions.length} permissions SAV créées/mises à jour`)

    // 2. Récupérer tous les rôles Super Admin de tous les magasins
    const superAdminRoles = await prisma.storeRole.findMany({
      where: {
        name: "Super Admin",
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`📍 ${superAdminRoles.length} rôle(s) Super Admin trouvé(s)`)

    // 3. Assigner les permissions SAV à chaque rôle Super Admin
    for (const role of superAdminRoles) {
      console.log(`\n🏪 Attribution des permissions SAV au magasin: ${role.store.name}`)

      await Promise.all(
        savPermissions.map((permission) =>
          prisma.storeRolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          })
        )
      )
      console.log(`✅ ${savPermissions.length} permissions SAV assignées`)
    }

    // 4. Récupérer aussi les rôles Manager et leur assigner les permissions SAV
    const managerRoles = await prisma.storeRole.findMany({
      where: {
        name: "Manager",
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log(`\n📍 ${managerRoles.length} rôle(s) Manager trouvé(s)`)

    for (const role of managerRoles) {
      console.log(`🏪 Attribution des permissions SAV au Manager de: ${role.store.name}`)

      await Promise.all(
        savPermissions.map((permission) =>
          prisma.storeRolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id,
              },
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id,
            },
          })
        )
      )
      console.log(`✅ ${savPermissions.length} permissions SAV assignées`)
    }

    // 5. Vérification finale
    console.log("\n📊 Résumé:")
    const savPermsCount = await prisma.storePermission.count({
      where: {
        name: {
          startsWith: "store.sav.",
        },
      },
    })

    const rolePermissionsCount = await prisma.storeRolePermission.count({
      where: {
        permission: {
          name: {
            startsWith: "store.sav.",
          },
        },
      },
    })

    console.log(`   Permissions SAV: ${savPermsCount}`)
    console.log(`   Assignations rôle-permission SAV: ${rolePermissionsCount}`)

    console.log("\n🎉 Permissions SAV ajoutées avec succès!")
    console.log("✅ Le lien SAV devrait maintenant apparaître dans la sidebar")

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions SAV:", error)
    throw error
  }
}

addSavPermissions()
  .then(async () => {
    await prisma.$disconnect()
    console.log("✅ Déconnexion de la base de données")
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
