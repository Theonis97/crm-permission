import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Permissions par défaut pour les magasins
const STORE_PERMISSIONS = [
  // Vue d'ensemble
  { name: 'store.dashboard.view', description: 'Voir le dashboard du magasin', module: 'dashboard', action: 'view' },
  
  // Catalogue
  { name: 'store.products.view', description: 'Voir les produits', module: 'products', action: 'view' },
  { name: 'store.products.create', description: 'Créer des produits', module: 'products', action: 'create' },
  { name: 'store.products.edit', description: 'Modifier les produits', module: 'products', action: 'edit' },
  { name: 'store.products.delete', description: 'Supprimer les produits', module: 'products', action: 'delete' },
  { name: 'store.products.stock', description: 'Gérer le stock', module: 'products', action: 'stock' },
  
  { name: 'store.categories.view', description: 'Voir les catégories', module: 'categories', action: 'view' },
  { name: 'store.categories.manage', description: 'Gérer les catégories', module: 'categories', action: 'manage' },
  
  { name: 'store.brands.view', description: 'Voir les marques', module: 'brands', action: 'view' },
  { name: 'store.brands.manage', description: 'Gérer les marques', module: 'brands', action: 'manage' },
  
  // Commandes
  { name: 'store.orders.view', description: 'Voir les commandes', module: 'orders', action: 'view' },
  { name: 'store.orders.create', description: 'Créer des commandes', module: 'orders', action: 'create' },
  { name: 'store.orders.edit', description: 'Modifier les commandes', module: 'orders', action: 'edit' },
  { name: 'store.orders.cancel', description: 'Annuler les commandes', module: 'orders', action: 'cancel' },
  { name: 'store.orders.fulfill', description: 'Traiter les commandes', module: 'orders', action: 'fulfill' },
  
  // Point de vente
  { name: 'store.pos.access', description: 'Accéder à la caisse', module: 'pos', action: 'access' },
  { name: 'store.pos.sell', description: 'Effectuer des ventes', module: 'pos', action: 'sell' },
  { name: 'store.pos.refund', description: 'Effectuer des remboursements', module: 'pos', action: 'refund' },
  
  // Contacts
  { name: 'store.contacts.view', description: 'Voir les contacts', module: 'contacts', action: 'view' },
  { name: 'store.contacts.create', description: 'Créer des contacts', module: 'contacts', action: 'create' },
  { name: 'store.contacts.edit', description: 'Modifier les contacts', module: 'contacts', action: 'edit' },
  { name: 'store.contacts.delete', description: 'Supprimer les contacts', module: 'contacts', action: 'delete' },
  
  // Livreurs
  { name: 'store.drivers.view', description: 'Voir les livreurs', module: 'drivers', action: 'view' },
  { name: 'store.drivers.manage', description: 'Gérer les livreurs', module: 'drivers', action: 'manage' },
  { name: 'store.drivers.assign', description: 'Assigner des commandes', module: 'drivers', action: 'assign' },
  
  // Zones
  { name: 'store.zones.view', description: 'Voir les zones', module: 'zones', action: 'view' },
  { name: 'store.zones.manage', description: 'Gérer les zones', module: 'zones', action: 'manage' },
  
  // Mouvements
  { name: 'store.movements.view', description: 'Voir les mouvements', module: 'movements', action: 'view' },
  { name: 'store.movements.create', description: 'Créer des mouvements', module: 'movements', action: 'create' },
  
  // Administration magasin
  { name: 'store.users.view', description: 'Voir les utilisateurs du magasin', module: 'users', action: 'view' },
  { name: 'store.users.invite', description: 'Inviter des utilisateurs', module: 'users', action: 'invite' },
  { name: 'store.users.roles', description: 'Gérer les rôles utilisateurs', module: 'users', action: 'roles' },
  { name: 'store.settings.edit', description: 'Modifier les paramètres', module: 'settings', action: 'edit' },
]

// Rôles par défaut avec leurs permissions
const DEFAULT_STORE_ROLES = [
  {
    name: 'Manager',
    description: 'Accès complet au magasin',
    permissions: STORE_PERMISSIONS.map(p => p.name), // Toutes les permissions
    isSystem: true
  },
  {
    name: 'Vendeur',
    description: 'Vente et gestion basique',
    permissions: [
      'store.dashboard.view',
      'store.products.view',
      'store.pos.access',
      'store.pos.sell',
      'store.contacts.view',
      'store.contacts.create',
      'store.orders.view',
      'store.orders.create'
    ],
    isSystem: true
  },
  {
    name: 'Caissier',
    description: 'Accès caisse uniquement',
    permissions: [
      'store.pos.access',
      'store.pos.sell',
      'store.products.view',
      'store.contacts.view'
    ],
    isSystem: true
  },
  {
    name: 'Gestionnaire Stock',
    description: 'Gestion des produits et stock',
    permissions: [
      'store.dashboard.view',
      'store.products.view',
      'store.products.edit',
      'store.products.stock',
      'store.categories.view',
      'store.brands.view',
      'store.movements.view',
      'store.movements.create'
    ],
    isSystem: true
  }
]

async function initStorePermissions() {
  console.log('🚀 Initialisation des permissions magasin...')
  
  try {
    // 1. Créer toutes les permissions
    console.log('📝 Création des permissions...')
    for (const permission of STORE_PERMISSIONS) {
      await prisma.storePermission.upsert({
        where: { name: permission.name },
        update: {},
        create: permission
      })
    }
    console.log(`✅ ${STORE_PERMISSIONS.length} permissions créées`)
    
    // 2. Récupérer tous les magasins existants
    const stores = await prisma.store.findMany()
    console.log(`🏪 ${stores.length} magasins trouvés`)
    
    // 3. Créer les rôles par défaut pour chaque magasin
    for (const store of stores) {
      console.log(`🔧 Configuration du magasin: ${store.name}`)
      
      for (const roleData of DEFAULT_STORE_ROLES) {
        // Créer le rôle
        const role = await prisma.storeRole.upsert({
          where: { 
            name_storeId: { 
              name: roleData.name, 
              storeId: store.id 
            } 
          },
          update: {},
          create: {
            name: roleData.name,
            description: roleData.description,
            storeId: store.id,
            isSystem: roleData.isSystem
          }
        })
        
        // Récupérer les permissions correspondantes
        const permissions = await prisma.storePermission.findMany({
          where: {
            name: { in: roleData.permissions }
          }
        })
        
        // Assigner les permissions au rôle
        for (const permission of permissions) {
          await prisma.storeRolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: role.id,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              roleId: role.id,
              permissionId: permission.id
            }
          })
        }
        
        console.log(`  ✅ Rôle "${roleData.name}" créé avec ${permissions.length} permissions`)
      }
    }
    
    console.log('🎉 Initialisation terminée avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
if (require.main === module) {
  initStorePermissions()
    .then(() => {
      console.log('✨ Script terminé')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Erreur fatale:', error)
      process.exit(1)
    })
}

export { initStorePermissions, STORE_PERMISSIONS, DEFAULT_STORE_ROLES }
