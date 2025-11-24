import type { 
  StoreRole as PrismaStoreRole, 
  StorePermission as PrismaStorePermission, 
  StoreUserRole as PrismaStoreUserRole,
  StoreRolePermission as PrismaStoreRolePermission,
  User as PrismaUser 
} from "@prisma/client"

export type StoreRole = PrismaStoreRole
export type StorePermission = PrismaStorePermission
export type StoreUserRole = PrismaStoreUserRole
export type StoreRolePermission = PrismaStoreRolePermission

export type StoreRoleWithPermissions = StoreRole & {
  storeRolePermissions: (StoreRolePermission & {
    permission: StorePermission
  })[]
  _count?: {
    storeUserRoles: number
  }
}

export type StoreUserRoleWithDetails = StoreUserRole & {
  user: Pick<PrismaUser, 'id' | 'name' | 'email' | 'image' | 'status' | 'createdAt'>
  role: StoreRoleWithPermissions
  assignedByUser: Pick<PrismaUser, 'id' | 'name' | 'email'>
}

export type StoreUserWithRoles = Pick<PrismaUser, 'id' | 'name' | 'email' | 'image' | 'status' | 'createdAt'> & {
  storeRoles: Array<{
    id: string
    name: string
    description: string | null
    isSystem: boolean
    assignedAt: Date
    assignedBy: Pick<PrismaUser, 'id' | 'name' | 'email'>
    permissions: StorePermission[]
  }>
}

export interface StoreUserPermissions {
  user: Pick<PrismaUser, 'id' | 'name' | 'email' | 'image'> | null
  permissions: string[]
  permissionsDetails: StorePermission[]
  roles: Array<{
    id: string
    name: string
    description: string | null
    isSystem: boolean
  }>
  hasStoreAccess: boolean
}

// Constantes pour les permissions
export const STORE_PERMISSIONS = {
  // Vue d'ensemble
  DASHBOARD_VIEW: 'store.dashboard.view',
  
  // Catalogue
  PRODUCTS_VIEW: 'store.products.view',
  PRODUCTS_CREATE: 'store.products.create',
  PRODUCTS_EDIT: 'store.products.edit',
  PRODUCTS_DELETE: 'store.products.delete',
  PRODUCTS_STOCK: 'store.products.stock',
  
  CATEGORIES_VIEW: 'store.categories.view',
  CATEGORIES_MANAGE: 'store.categories.manage',
  
  BRANDS_VIEW: 'store.brands.view',
  BRANDS_MANAGE: 'store.brands.manage',
  
  // Commandes
  ORDERS_VIEW: 'store.orders.view',
  ORDERS_CREATE: 'store.orders.create',
  ORDERS_EDIT: 'store.orders.edit',
  ORDERS_CANCEL: 'store.orders.cancel',
  ORDERS_FULFILL: 'store.orders.fulfill',
  
  // Point de vente
  POS_ACCESS: 'store.pos.access',
  POS_SELL: 'store.pos.sell',
  POS_REFUND: 'store.pos.refund',
  
  // Contacts
  CONTACTS_VIEW: 'store.contacts.view',
  CONTACTS_CREATE: 'store.contacts.create',
  CONTACTS_EDIT: 'store.contacts.edit',
  CONTACTS_DELETE: 'store.contacts.delete',
  
  // Livreurs
  DRIVERS_VIEW: 'store.drivers.view',
  DRIVERS_MANAGE: 'store.drivers.manage',
  DRIVERS_ASSIGN: 'store.drivers.assign',
  
  // Zones
  ZONES_VIEW: 'store.zones.view',
  ZONES_MANAGE: 'store.zones.manage',
  
  // Mouvements
  MOVEMENTS_VIEW: 'store.movements.view',
  MOVEMENTS_CREATE: 'store.movements.create',
  
  // Administration magasin
  USERS_VIEW: 'store.users.view',
  USERS_INVITE: 'store.users.invite',
  USERS_ROLES: 'store.users.roles',
  SETTINGS_EDIT: 'store.settings.edit',
} as const

// Type pour les permissions (union des valeurs)
export type StorePermissionName = typeof STORE_PERMISSIONS[keyof typeof STORE_PERMISSIONS]

// Groupement des permissions par module
export const STORE_PERMISSION_GROUPS = {
  dashboard: [STORE_PERMISSIONS.DASHBOARD_VIEW],
  products: [
    STORE_PERMISSIONS.PRODUCTS_VIEW,
    STORE_PERMISSIONS.PRODUCTS_CREATE,
    STORE_PERMISSIONS.PRODUCTS_EDIT,
    STORE_PERMISSIONS.PRODUCTS_DELETE,
    STORE_PERMISSIONS.PRODUCTS_STOCK,
  ],
  categories: [
    STORE_PERMISSIONS.CATEGORIES_VIEW,
    STORE_PERMISSIONS.CATEGORIES_MANAGE,
  ],
  brands: [
    STORE_PERMISSIONS.BRANDS_VIEW,
    STORE_PERMISSIONS.BRANDS_MANAGE,
  ],
  orders: [
    STORE_PERMISSIONS.ORDERS_VIEW,
    STORE_PERMISSIONS.ORDERS_CREATE,
    STORE_PERMISSIONS.ORDERS_EDIT,
    STORE_PERMISSIONS.ORDERS_CANCEL,
    STORE_PERMISSIONS.ORDERS_FULFILL,
  ],
  pos: [
    STORE_PERMISSIONS.POS_ACCESS,
    STORE_PERMISSIONS.POS_SELL,
    STORE_PERMISSIONS.POS_REFUND,
  ],
  contacts: [
    STORE_PERMISSIONS.CONTACTS_VIEW,
    STORE_PERMISSIONS.CONTACTS_CREATE,
    STORE_PERMISSIONS.CONTACTS_EDIT,
    STORE_PERMISSIONS.CONTACTS_DELETE,
  ],
  drivers: [
    STORE_PERMISSIONS.DRIVERS_VIEW,
    STORE_PERMISSIONS.DRIVERS_MANAGE,
    STORE_PERMISSIONS.DRIVERS_ASSIGN,
  ],
  zones: [
    STORE_PERMISSIONS.ZONES_VIEW,
    STORE_PERMISSIONS.ZONES_MANAGE,
  ],
  movements: [
    STORE_PERMISSIONS.MOVEMENTS_VIEW,
    STORE_PERMISSIONS.MOVEMENTS_CREATE,
  ],
  users: [
    STORE_PERMISSIONS.USERS_VIEW,
    STORE_PERMISSIONS.USERS_INVITE,
    STORE_PERMISSIONS.USERS_ROLES,
  ],
  settings: [
    STORE_PERMISSIONS.SETTINGS_EDIT,
  ],
} as const

// Rôles par défaut
export const DEFAULT_STORE_ROLES = {
  MANAGER: 'Manager',
  SELLER: 'Vendeur',
  CASHIER: 'Caissier',
  STOCK_MANAGER: 'Gestionnaire Stock',
} as const
