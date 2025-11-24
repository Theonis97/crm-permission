import { PrismaClient } from "@prisma/client"
import { STORE_PERMISSIONS } from "@/types/store-auth"

const prisma = new PrismaClient()

async function createStorePermissions() {
  console.log("🏪 Création des permissions de magasin...")

  try {
    // Définir toutes les permissions de magasin avec leurs descriptions
    const storePermissionsData = [
      // Dashboard
      {
        name: STORE_PERMISSIONS.DASHBOARD_VIEW,
        description: "Voir le tableau de bord du magasin",
        module: "dashboard",
        action: "view"
      },

      // Produits
      {
        name: STORE_PERMISSIONS.PRODUCTS_VIEW,
        description: "Voir les produits du magasin",
        module: "products",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.PRODUCTS_CREATE,
        description: "Créer des produits dans le magasin",
        module: "products",
        action: "create"
      },
      {
        name: STORE_PERMISSIONS.PRODUCTS_EDIT,
        description: "Modifier les produits du magasin",
        module: "products",
        action: "edit"
      },
      {
        name: STORE_PERMISSIONS.PRODUCTS_DELETE,
        description: "Supprimer les produits du magasin",
        module: "products",
        action: "delete"
      },
      {
        name: STORE_PERMISSIONS.PRODUCTS_STOCK,
        description: "Gérer le stock des produits",
        module: "products",
        action: "stock"
      },

      // Catégories
      {
        name: STORE_PERMISSIONS.CATEGORIES_VIEW,
        description: "Voir les catégories du magasin",
        module: "categories",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.CATEGORIES_MANAGE,
        description: "Gérer les catégories du magasin",
        module: "categories",
        action: "manage"
      },

      // Marques
      {
        name: STORE_PERMISSIONS.BRANDS_VIEW,
        description: "Voir les marques du magasin",
        module: "brands",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.BRANDS_MANAGE,
        description: "Gérer les marques du magasin",
        module: "brands",
        action: "manage"
      },

      // Commandes
      {
        name: STORE_PERMISSIONS.ORDERS_VIEW,
        description: "Voir les commandes du magasin",
        module: "orders",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.ORDERS_CREATE,
        description: "Créer des commandes",
        module: "orders",
        action: "create"
      },
      {
        name: STORE_PERMISSIONS.ORDERS_EDIT,
        description: "Modifier les commandes",
        module: "orders",
        action: "edit"
      },
      {
        name: STORE_PERMISSIONS.ORDERS_CANCEL,
        description: "Annuler les commandes",
        module: "orders",
        action: "cancel"
      },
      {
        name: STORE_PERMISSIONS.ORDERS_FULFILL,
        description: "Traiter et livrer les commandes",
        module: "orders",
        action: "fulfill"
      },

      // Point de vente (POS)
      {
        name: STORE_PERMISSIONS.POS_ACCESS,
        description: "Accéder au point de vente",
        module: "pos",
        action: "access"
      },
      {
        name: STORE_PERMISSIONS.POS_SELL,
        description: "Effectuer des ventes au point de vente",
        module: "pos",
        action: "sell"
      },
      {
        name: STORE_PERMISSIONS.POS_REFUND,
        description: "Effectuer des remboursements",
        module: "pos",
        action: "refund"
      },

      // Contacts
      {
        name: STORE_PERMISSIONS.CONTACTS_VIEW,
        description: "Voir les contacts du magasin",
        module: "contacts",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.CONTACTS_CREATE,
        description: "Créer des contacts",
        module: "contacts",
        action: "create"
      },
      {
        name: STORE_PERMISSIONS.CONTACTS_EDIT,
        description: "Modifier les contacts",
        module: "contacts",
        action: "edit"
      },
      {
        name: STORE_PERMISSIONS.CONTACTS_DELETE,
        description: "Supprimer les contacts",
        module: "contacts",
        action: "delete"
      },

      // Livreurs
      {
        name: STORE_PERMISSIONS.DRIVERS_VIEW,
        description: "Voir les livreurs du magasin",
        module: "drivers",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.DRIVERS_MANAGE,
        description: "Gérer les livreurs (ajouter, modifier, supprimer)",
        module: "drivers",
        action: "manage"
      },
      {
        name: STORE_PERMISSIONS.DRIVERS_ASSIGN,
        description: "Assigner des livreurs aux commandes",
        module: "drivers",
        action: "assign"
      },

      // Zones de livraison
      {
        name: STORE_PERMISSIONS.ZONES_VIEW,
        description: "Voir les zones de livraison",
        module: "zones",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.ZONES_MANAGE,
        description: "Gérer les zones de livraison",
        module: "zones",
        action: "manage"
      },

      // Mouvements de stock
      {
        name: STORE_PERMISSIONS.MOVEMENTS_VIEW,
        description: "Voir les mouvements de stock",
        module: "movements",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.MOVEMENTS_CREATE,
        description: "Créer des mouvements de stock",
        module: "movements",
        action: "create"
      },

      // Administration des utilisateurs
      {
        name: STORE_PERMISSIONS.USERS_VIEW,
        description: "Voir les utilisateurs du magasin",
        module: "users",
        action: "view"
      },
      {
        name: STORE_PERMISSIONS.USERS_INVITE,
        description: "Inviter des utilisateurs dans le magasin",
        module: "users",
        action: "invite"
      },
      {
        name: STORE_PERMISSIONS.USERS_ROLES,
        description: "Gérer les rôles des utilisateurs",
        module: "users",
        action: "roles"
      },

      // Paramètres
      {
        name: STORE_PERMISSIONS.SETTINGS_EDIT,
        description: "Modifier les paramètres du magasin",
        module: "settings",
        action: "edit"
      },
    ]

    console.log(`📝 Création de ${storePermissionsData.length} permissions de magasin...`)

    // Créer toutes les permissions avec upsert pour éviter les doublons
    const createdPermissions = await Promise.all(
      storePermissionsData.map(async (permissionData) => {
        const permission = await prisma.storePermission.upsert({
          where: { name: permissionData.name },
          update: {
            description: permissionData.description,
            module: permissionData.module,
            action: permissionData.action,
          },
          create: permissionData,
        })
        console.log(`✅ Permission créée/mise à jour: ${permission.name}`)
        return permission
      })
    )

    // Statistiques par module
    const permissionsByModule = createdPermissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = 0
      }
      acc[permission.module]++
      return acc
    }, {} as Record<string, number>)

    console.log("\n📊 Résumé par module:")
    Object.entries(permissionsByModule).forEach(([module, count]) => {
      console.log(`   ${module}: ${count} permission(s)`)
    })

    console.log(`\n🎉 ${createdPermissions.length} permissions de magasin créées avec succès!`)
    console.log("✅ Les permissions sont maintenant disponibles pour les rôles de magasin")

    // Vérification finale
    const totalStorePermissions = await prisma.storePermission.count()
    console.log(`📈 Total des permissions de magasin en base: ${totalStorePermissions}`)

  } catch (error) {
    console.error("❌ Erreur lors de la création des permissions de magasin:", error)
    throw error
  }
}

createStorePermissions()
  .then(async () => {
    await prisma.$disconnect()
    console.log("✅ Déconnexion de la base de données")
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
