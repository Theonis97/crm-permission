import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addAdminStoreAccess() {
  console.log("🔑 Ajout des accès magasin pour admin@example.com...")

  try {
    // Trouver l'utilisateur admin
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    })

    if (!adminUser) {
      console.error("❌ Utilisateur admin@example.com non trouvé")
      return
    }

    console.log(`✅ Utilisateur trouvé: ${adminUser.name} (${adminUser.email})`)

    // Récupérer tous les magasins
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`📍 ${stores.length} magasin(s) trouvé(s)`)

    // Pour chaque magasin
    for (const store of stores) {
      console.log(`\n🏪 Traitement du magasin: ${store.name}`)

      // Vérifier si les permissions globales existent et les créer si nécessaire
      const basePermissions = [
        { name: 'store.dashboard.view', description: 'Voir le tableau de bord', module: 'dashboard', action: 'view' },
        { name: 'store.products.view', description: 'Voir les produits', module: 'products', action: 'view' },
        { name: 'store.products.create', description: 'Créer des produits', module: 'products', action: 'create' },
        { name: 'store.products.edit', description: 'Modifier les produits', module: 'products', action: 'edit' },
        { name: 'store.products.delete', description: 'Supprimer les produits', module: 'products', action: 'delete' },
        { name: 'store.products.stock', description: 'Gérer le stock des produits', module: 'products', action: 'stock' },
        { name: 'store.orders.view', description: 'Voir les commandes', module: 'orders', action: 'view' },
        { name: 'store.orders.create', description: 'Créer des commandes', module: 'orders', action: 'create' },
        { name: 'store.orders.edit', description: 'Modifier les commandes', module: 'orders', action: 'edit' },
        { name: 'store.pos.access', description: 'Accéder au point de vente', module: 'pos', action: 'access' },
        { name: 'store.pos.sell', description: 'Effectuer des ventes', module: 'pos', action: 'sell' },
        { name: 'store.users.view', description: 'Voir les utilisateurs', module: 'users', action: 'view' },
        { name: 'store.users.invite', description: 'Inviter des utilisateurs', module: 'users', action: 'invite' },
        { name: 'store.users.roles', description: 'Gérer les rôles utilisateurs', module: 'users', action: 'roles' },
        { name: 'store.settings.edit', description: 'Modifier les paramètres', module: 'settings', action: 'edit' },
      ]

      // Créer les permissions globales si elles n'existent pas
      for (const permission of basePermissions) {
        await prisma.storePermission.upsert({
          where: { name: permission.name },
          update: {
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
          create: {
            name: permission.name,
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
        })
      }

      // Récupérer ou créer le rôle "Super Admin" pour ce magasin
      let superAdminRole = await prisma.storeRole.findFirst({
        where: {
          storeId: store.id,
          name: "Super Admin",
        },
      })

      if (!superAdminRole) {
        console.log("🔨 Création du rôle Super Admin pour ce magasin...")
        superAdminRole = await prisma.storeRole.create({
          data: {
            storeId: store.id,
            name: "Super Admin",
            description: "Accès complet au magasin",
            isSystem: true,
          },
        })
        console.log("✅ Rôle Super Admin créé")
      }

      // Récupérer toutes les permissions globales de magasin
      const allStorePermissions = await prisma.storePermission.findMany({
        where: {
          name: {
            startsWith: 'store.',
          },
        },
      })

      // Assigner toutes les permissions au rôle Super Admin
      for (const permission of allStorePermissions) {
        await prisma.storeRolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: superAdminRole.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        })
      }
      console.log(`✅ ${allStorePermissions.length} permissions assignées au rôle Super Admin`)

      // Assigner le rôle Super Admin à l'utilisateur admin
      const existingUserRole = await prisma.storeUserRole.findFirst({
        where: {
          userId: adminUser.id,
          storeId: store.id,
          roleId: superAdminRole.id,
        },
      })

      if (!existingUserRole) {
        await prisma.storeUserRole.create({
          data: {
            userId: adminUser.id,
            storeId: store.id,
            roleId: superAdminRole.id,
            assignedBy: adminUser.id, // Auto-assigné
          },
        })
        console.log("✅ Rôle Super Admin assigné à admin@example.com")
      } else {
        console.log("ℹ️  L'utilisateur a déjà le rôle Super Admin pour ce magasin")
      }
    }

    console.log("\n🎉 Accès magasin ajouté avec succès pour admin@example.com!")
    console.log("🔄 Vous pouvez maintenant accéder à toutes les pages des magasins")

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des accès:", error)
  } finally {
    await prisma.$disconnect()
  }
}

addAdminStoreAccess()
