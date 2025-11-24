import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function addStorePermissionsAndRoles() {
  console.log("🏪 Ajout des permissions et rôles de magasin...")

  try {
    // 1. Créer les permissions de magasin (StorePermission) si elles n'existent pas
    console.log("🔐 Création des permissions de magasin...")
    
    const storePermissionsData = [
      // Dashboard
      { name: "store.dashboard.view", description: "Voir le tableau de bord du magasin", module: "dashboard", action: "view" },
      
      // Products
      { name: "store.products.view", description: "Voir les produits du magasin", module: "products", action: "view" },
      { name: "store.products.create", description: "Créer des produits dans le magasin", module: "products", action: "create" },
      { name: "store.products.edit", description: "Modifier les produits du magasin", module: "products", action: "edit" },
      { name: "store.products.delete", description: "Supprimer les produits du magasin", module: "products", action: "delete" },
      { name: "store.products.stock", description: "Gérer le stock des produits", module: "products", action: "stock" },
      
      // Categories
      { name: "store.categories.view", description: "Voir les catégories", module: "categories", action: "view" },
      { name: "store.categories.manage", description: "Gérer les catégories", module: "categories", action: "manage" },
      
      // Brands
      { name: "store.brands.view", description: "Voir les marques", module: "brands", action: "view" },
      { name: "store.brands.manage", description: "Gérer les marques", module: "brands", action: "manage" },
      
      // Orders
      { name: "store.orders.view", description: "Voir les commandes du magasin", module: "orders", action: "view" },
      { name: "store.orders.create", description: "Créer des commandes", module: "orders", action: "create" },
      { name: "store.orders.edit", description: "Modifier les commandes", module: "orders", action: "edit" },
      { name: "store.orders.cancel", description: "Annuler les commandes", module: "orders", action: "cancel" },
      { name: "store.orders.fulfill", description: "Traiter les commandes", module: "orders", action: "fulfill" },
      
      // POS
      { name: "store.pos.access", description: "Accéder au point de vente", module: "pos", action: "access" },
      { name: "store.pos.sell", description: "Effectuer des ventes", module: "pos", action: "sell" },
      { name: "store.pos.refund", description: "Effectuer des remboursements", module: "pos", action: "refund" },
      
      // Contacts
      { name: "store.contacts.view", description: "Voir les contacts du magasin", module: "contacts", action: "view" },
      { name: "store.contacts.create", description: "Créer des contacts", module: "contacts", action: "create" },
      { name: "store.contacts.edit", description: "Modifier les contacts", module: "contacts", action: "edit" },
      { name: "store.contacts.delete", description: "Supprimer les contacts", module: "contacts", action: "delete" },
      
      // Drivers
      { name: "store.drivers.view", description: "Voir les livreurs", module: "drivers", action: "view" },
      { name: "store.drivers.manage", description: "Gérer les livreurs", module: "drivers", action: "manage" },
      { name: "store.drivers.assign", description: "Assigner des livreurs", module: "drivers", action: "assign" },
      
      // Zones
      { name: "store.zones.view", description: "Voir les zones de livraison", module: "zones", action: "view" },
      { name: "store.zones.manage", description: "Gérer les zones de livraison", module: "zones", action: "manage" },
      
      // Movements
      { name: "store.movements.view", description: "Voir les mouvements de stock", module: "movements", action: "view" },
      { name: "store.movements.create", description: "Créer des mouvements de stock", module: "movements", action: "create" },
      
      // Users (LA PERMISSION MANQUANTE!)
      { name: "store.users.view", description: "Voir les utilisateurs du magasin", module: "users", action: "view" },
      { name: "store.users.invite", description: "Inviter des utilisateurs", module: "users", action: "invite" },
      { name: "store.users.roles", description: "Gérer les rôles des utilisateurs", module: "users", action: "roles" },
      
      // Settings
      { name: "store.settings.edit", description: "Modifier les paramètres du magasin", module: "settings", action: "edit" },
    ]

    // Créer les permissions de magasin
    const storePermissions = await Promise.all(
      storePermissionsData.map((permission) =>
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

    console.log(`✅ ${storePermissions.length} permissions de magasin créées/mises à jour`)

    // 2. Récupérer l'utilisateur admin@example.com
    const adminUser = await prisma.user.findUnique({
      where: { email: "admin@example.com" },
    })

    if (!adminUser) {
      console.error("❌ Utilisateur admin@example.com non trouvé")
      return
    }

    console.log(`✅ Utilisateur trouvé: ${adminUser.name} (${adminUser.email})`)

    // 3. Récupérer tous les magasins
    const stores = await prisma.store.findMany({
      select: {
        id: true,
        name: true,
      },
    })

    console.log(`📍 ${stores.length} magasin(s) trouvé(s)`)

    // 4. Pour chaque magasin, créer un rôle Super Admin et l'assigner à admin@example.com
    for (const store of stores) {
      console.log(`\n🏪 Traitement du magasin: ${store.name}`)

      // Créer ou récupérer le rôle Super Admin pour ce magasin
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
      } else {
        console.log("ℹ️  Rôle Super Admin existe déjà")
      }

      // Assigner toutes les permissions de magasin au rôle Super Admin
      console.log("🔗 Attribution des permissions au rôle Super Admin...")
      await Promise.all(
        storePermissions.map((permission) =>
          prisma.storeRolePermission.upsert({
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
        )
      )
      console.log(`✅ ${storePermissions.length} permissions assignées au rôle Super Admin`)

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

    // 5. Vérification finale
    console.log("\n📊 Résumé de la création:")
    const counts = {
      storePermissions: await prisma.storePermission.count(),
      storeRoles: await prisma.storeRole.count(),
      storeUserRoles: await prisma.storeUserRole.count(),
      storeRolePermissions: await prisma.storeRolePermission.count(),
    }

    console.log(`   Permissions de magasin: ${counts.storePermissions}`)
    console.log(`   Rôles de magasin: ${counts.storeRoles}`)
    console.log(`   Assignations utilisateur-rôle magasin: ${counts.storeUserRoles}`)
    console.log(`   Assignations rôle-permission magasin: ${counts.storeRolePermissions}`)

    console.log("\n🎉 Permissions de magasin ajoutées avec succès!")
    console.log("✅ admin@example.com peut maintenant accéder à toutes les pages des magasins")
    console.log("🔑 Notamment à /dashboard/stores/[id]/users")

  } catch (error) {
    console.error("❌ Erreur lors de l'ajout des permissions de magasin:", error)
    throw error
  }
}

addStorePermissionsAndRoles()
  .then(async () => {
    await prisma.$disconnect()
    console.log("✅ Déconnexion de la base de données")
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
