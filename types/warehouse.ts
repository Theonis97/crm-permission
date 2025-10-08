// Types pour le module Entrepôt

// ============================================
// ENTREPÔTS
// ============================================

export type WarehouseStatus = "ACTIVE" | "INACTIVE"
export type ZoneType = "RECEPTION" | "STORAGE" | "PICKING" | "SHIPPING" | "TRANSIT"
export type LocationType = "PICKING" | "STORAGE" | "TRANSIT"
export type CapacityType = "VOLUME" | "AREA" | "QUANTITY"

export interface GPSLocation {
  lat: number
  lng: number
}

export interface Capacity {
  type: CapacityType
  value: number
  unit: string // m³, m², unités
}

export interface Location {
  id: string
  code: string // ex: "A-B-3"
  type: LocationType
  capacity?: number
  currentOccupation?: number
}

export interface Zone {
  id: string
  name: string
  code: string
  type: ZoneType
  locations: Location[]
  capacity?: number
  currentOccupation?: number
}

export interface Warehouse {
  id: string
  name: string
  code: string
  address: string
  city?: string
  postalCode?: string
  country?: string
  gpsLocation?: GPSLocation
  responsibleUserId: string
  responsibleUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  capacity: Capacity
  currentOccupation?: number
  status: WarehouseStatus
  zones: Zone[]
  createdAt: Date
  updatedAt: Date
}

export interface WarehouseFilters {
  search?: string
  status?: WarehouseStatus
  responsibleUserId?: string
}

export interface CreateWarehouseData {
  name: string
  code: string
  address: string
  city?: string
  postalCode?: string
  country?: string
  gpsLocation?: GPSLocation
  responsibleUserId: string
  capacity: Capacity
  status: WarehouseStatus
}

export interface UpdateWarehouseData extends Partial<CreateWarehouseData> {
  id: string
}

// ============================================
// PRODUITS EN STOCK
// ============================================

export type ProductUnit = "PIECE" | "KG" | "LITER" | "METER" | "BOX" | "PALLET"
export type StockStatus = "OK" | "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCKED" | "EXPIRED"
export type ProductCategory =
  | "RAW_MATERIAL"
  | "FINISHED_PRODUCT"
  | "SEMI_FINISHED"
  | "CONSUMABLE"
  | "PACKAGING"

export interface StockProduct {
  id: string
  sku: string
  name: string
  description?: string
  category: ProductCategory
  unit: ProductUnit
  warehouseId: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zoneId?: string
  zone?: {
    id: string
    name: string
    code: string
  }
  locationId?: string
  location?: {
    id: string
    code: string
  }
  quantityAvailable: number
  quantityReserved: number
  quantityTotal: number // Available + Reserved
  quantityMin: number
  quantityMax: number
  lotNumber?: string
  serialNumber?: string
  expirationDate?: Date
  status: StockStatus
  lastMovementDate?: Date
  rotationRate?: number // Vitesse de rotation (sorties/mois)
  createdAt: Date
  updatedAt: Date
}

export interface StockProductFilters {
  search?: string
  warehouseId?: string
  zoneId?: string
  category?: ProductCategory
  status?: StockStatus
  expiringBefore?: Date
}

export interface CreateStockProductData {
  sku: string
  name: string
  description?: string
  category: ProductCategory
  unit: ProductUnit
  warehouseId: string
  zoneId?: string
  locationId?: string
  quantityAvailable: number
  quantityReserved: number
  quantityMin: number
  quantityMax: number
  lotNumber?: string
  serialNumber?: string
  expirationDate?: Date
}

export interface UpdateStockProductData extends Partial<CreateStockProductData> {
  id: string
}

// ============================================
// MOUVEMENTS DE STOCK
// ============================================

export type MovementType = "IN" | "OUT" | "TRANSFER" | "ADJUSTMENT"
export type MovementSubtype =
  | "PURCHASE"
  | "RETURN_CLIENT"
  | "SALE"
  | "LOSS"
  | "DAMAGE"
  | "THEFT"
  | "TRANSFER"
  | "ADJUSTMENT_POSITIVE"
  | "ADJUSTMENT_NEGATIVE"
  | "PRODUCTION"
  | "CONSUMPTION"
export type MovementStatus = "PENDING" | "VALIDATED" | "CANCELLED"

export interface StockMovement {
  id: string
  type: MovementType
  subtype: MovementSubtype
  productId: string
  product?: {
    id: string
    sku: string
    name: string
    unit: ProductUnit
  }
  quantity: number
  fromWarehouseId?: string
  fromWarehouse?: {
    id: string
    name: string
    code: string
  }
  toWarehouseId?: string
  toWarehouse?: {
    id: string
    name: string
    code: string
  }
  fromLocationId?: string
  toLocationId?: string
  userId: string
  user?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  reason: string
  notes?: string
  documentNumber?: string // Bon de réception, bon de sortie, etc.
  status: MovementStatus
  createdAt: Date
  validatedAt?: Date
  validatedByUserId?: string
  validatedBy?: {
    id: string
    firstName: string | null
    lastName: string | null
  }
}

export interface MovementFilters {
  search?: string
  type?: MovementType
  subtype?: MovementSubtype
  productId?: string
  warehouseId?: string
  status?: MovementStatus
  userId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface CreateMovementData {
  type: MovementType
  subtype: MovementSubtype
  productId: string
  quantity: number
  fromWarehouseId?: string
  toWarehouseId?: string
  fromLocationId?: string
  toLocationId?: string
  reason: string
  notes?: string
  documentNumber?: string
}

// ============================================
// INVENTAIRES
// ============================================

export type InventoryType = "FULL" | "CYCLE" | "SPOT"
export type InventoryStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "VALIDATED" | "CANCELLED"
export type InventoryItemStatus = "PENDING" | "COUNTED" | "ADJUSTED" | "CONFIRMED"

export interface InventoryItem {
  id: string
  inventoryId: string
  productId: string
  product?: {
    id: string
    sku: string
    name: string
    unit: ProductUnit
  }
  locationId?: string
  location?: {
    id: string
    code: string
  }
  theoreticalQuantity: number
  physicalQuantity?: number
  difference?: number
  differencePercentage?: number
  status: InventoryItemStatus
  notes?: string
  countedByUserId?: string
  countedBy?: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  countedAt?: Date
}

export interface Inventory {
  id: string
  reference: string
  type: InventoryType
  status: InventoryStatus
  warehouseId: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zoneId?: string
  zone?: {
    id: string
    name: string
    code: string
  }
  scheduledDate: Date
  startedAt?: Date
  completedAt?: Date
  validatedAt?: Date
  responsibleUserId: string
  responsibleUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  validatedByUserId?: string
  validatedBy?: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  items: InventoryItem[]
  totalItems?: number
  countedItems?: number
  itemsWithDifference?: number
  totalDifferenceValue?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface InventoryFilters {
  search?: string
  type?: InventoryType
  status?: InventoryStatus
  warehouseId?: string
  zoneId?: string
  responsibleUserId?: string
  dateFrom?: Date
  dateTo?: Date
}

export interface CreateInventoryData {
  reference: string
  type: InventoryType
  warehouseId: string
  zoneId?: string
  scheduledDate: Date
  responsibleUserId: string
  notes?: string
}

export interface UpdateInventoryItemData {
  id: string
  physicalQuantity: number
  notes?: string
}

// ============================================
// STATISTIQUES & DASHBOARD
// ============================================

export interface WarehouseStats {
  totalWarehouses: number
  activeWarehouses: number
  totalCapacity: number
  totalOccupation: number
  occupationRate: number
}

export interface StockStats {
  totalProducts: number
  totalQuantity: number
  productsOk: number
  productsLowStock: number
  productsOutOfStock: number
  productsOverstocked: number
  productsExpiringSoon: number
  totalValue?: number
}

export interface MovementStats {
  totalMovements: number
  movementsToday: number
  movementsThisWeek: number
  movementsThisMonth: number
  entriesThisMonth: number
  exitsThisMonth: number
  pendingMovements: number
}

export interface InventoryStats {
  totalInventories: number
  plannedInventories: number
  inProgressInventories: number
  completedInventories: number
  lastInventoryDate?: Date
  averageAccuracy?: number
}

export interface DashboardData {
  warehouseStats: WarehouseStats
  stockStats: StockStats
  movementStats: MovementStats
  inventoryStats: InventoryStats
  recentMovements: StockMovement[]
  stockAlerts: StockProduct[]
  upcomingInventories: Inventory[]
}

// ============================================
// ALERTES
// ============================================

export type AlertType = "LOW_STOCK" | "OUT_OF_STOCK" | "OVERSTOCKED" | "EXPIRING_SOON" | "EXPIRED"
export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL"

export interface StockAlert {
  id: string
  type: AlertType
  severity: AlertSeverity
  productId: string
  product: StockProduct
  message: string
  createdAt: Date
  resolvedAt?: Date
}
