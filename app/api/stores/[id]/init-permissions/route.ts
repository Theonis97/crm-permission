import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST /api/stores/[id]/init-permissions - Initialiser les permissions et rôles par défaut pour un magasin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

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

    let createdPermissions = 0
    let createdRoles = 0

    await prisma.$transaction(async (tx) => {
      // 1. Créer toutes les permissions (si elles n'existent pas déjà)
      for (const permission of STORE_PERMISSIONS) {
        const existingPermission = await tx.storePermission.findUnique({
          where: { name: permission.name }
        })

        if (!existingPermission) {
          await tx.storePermission.create({
            data: permission
          })
          createdPermissions++
        }
      }

      // 2. Créer les rôles par défaut pour ce magasin
      for (const roleData of DEFAULT_STORE_ROLES) {
        // Vérifier si le rôle existe déjà pour ce magasin
        const existingRole = await tx.storeRole.findUnique({
          where: { 
            name_storeId: { 
              name: roleData.name, 
              storeId 
            } 
          }
        })

        if (!existingRole) {
          // Créer le rôle
          const role = await tx.storeRole.create({
            data: {
              name: roleData.name,
              description: roleData.description,
              storeId,
              isSystem: roleData.isSystem
            }
          })

          // Récupérer les permissions correspondantes
          const permissions = await tx.storePermission.findMany({
            where: {
              name: { in: roleData.permissions }
            }
          })

          // Assigner les permissions au rôle
          for (const permission of permissions) {
            await tx.storeRolePermission.create({
              data: {
                roleId: role.id,
                permissionId: permission.id
              }
            })
          }

          createdRoles++
        }
      }

      // 3. Assigner le rôle Manager au manager du magasin (si défini)
      if (store.managerId) {
        const managerRole = await tx.storeRole.findUnique({
          where: {
            name_storeId: {
              name: 'Manager',
              storeId
            }
          }
        })

        if (managerRole) {
          // Vérifier si l'assignation existe déjà
          const existingAssignment = await tx.storeUserRole.findUnique({
            where: {
              userId_storeId_roleId: {
                userId: store.managerId,
                storeId,
                roleId: managerRole.id
              }
            }
          })

          if (!existingAssignment) {
            await tx.storeUserRole.create({
              data: {
                userId: store.managerId,
                storeId,
                roleId: managerRole.id,
                assignedBy: session.user.id
              }
            })
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: `Initialisation terminée pour le magasin ${store.name}`,
      stats: {
        permissionsCreated: createdPermissions,
        rolesCreated: createdRoles,
        totalPermissions: STORE_PERMISSIONS.length,
        totalRoles: DEFAULT_STORE_ROLES.length
      }
    })

  } catch (error) {
    console.error("Error initializing store permissions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
