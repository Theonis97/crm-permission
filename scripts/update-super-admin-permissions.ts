import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function updateSuperAdminPermissions() {
  console.log("🔧 Mise à jour des permissions Super Admin...")

  try {
    // 1. Récupérer toutes les permissions de magasin
    const allStorePermissions = await prisma.storePermission.findMany({
      select: {
        id: true,
        name: true,
        module: true,
      },
      orderBy: {
        module: "asc",
      },
    })

    console.log(`📋 ${allStorePermissions.length} permissions de magasin trouvées`)

    // 2. Récupérer tous les rôles Super Admin de magasin
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
        storeRolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    })

    console.log(`👑 ${superAdminRoles.length} rôle(s) Super Admin trouvé(s)`)

    // 3. Pour chaque rôle Super Admin, s'assurer qu'il a toutes les permissions
    for (const role of superAdminRoles) {
      console.log(`\n🏪 Traitement du magasin: ${role.store.name}`)
      
      // Permissions actuelles du rôle
      const currentPermissionIds = role.storeRolePermissions.map(rp => rp.permission.id)
      console.log(`   Permissions actuelles: ${currentPermissionIds.length}`)

      // Permissions manquantes
      const missingPermissions = allStorePermissions.filter(
        permission => !currentPermissionIds.includes(permission.id)
      )

      if (missingPermissions.length > 0) {
        console.log(`   ➕ Ajout de ${missingPermissions.length} permission(s) manquante(s)`)
        
        // Ajouter les permissions manquantes
        await prisma.storeRolePermission.createMany({
          data: missingPermissions.map(permission => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true, // Éviter les erreurs si la permission existe déjà
        })

        console.log(`   ✅ Permissions ajoutées avec succès`)
      } else {
        console.log(`   ✅ Toutes les permissions sont déjà assignées`)
      }
    }

    // 4. Vérification finale
    console.log("\n📊 Vérification finale...")
    for (const role of superAdminRoles) {
      const updatedRole = await prisma.storeRole.findUnique({
        where: { id: role.id },
        include: {
          storeRolePermissions: true,
          store: {
            select: { name: true },
          },
        },
      })

      if (updatedRole) {
        console.log(`   ${updatedRole.store.name}: ${updatedRole.storeRolePermissions.length}/${allStorePermissions.length} permissions`)
      }
    }

    console.log("\n🎉 Mise à jour des permissions Super Admin terminée!")
    console.log("✅ Tous les Super Admin ont maintenant accès à toutes les fonctionnalités")

  } catch (error) {
    console.error("❌ Erreur lors de la mise à jour des permissions:", error)
    throw error
  }
}

updateSuperAdminPermissions()
  .then(async () => {
    await prisma.$disconnect()
    console.log("✅ Déconnexion de la base de données")
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
