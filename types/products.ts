export interface ProductCategory {
    id: string
    name: string
    description?: string
    parentId?: string
    parent?: ProductCategory
    subcategories?: ProductCategory[]
    products?: Product[]
    createdAt: Date
    updatedAt: Date
  }
  
  export interface Product {
    id: string
    name: string
    description?: string
    photos: string[]
    prixVente: number
    prixAchat: number
    tva: number
    stock: number
    categoryId?: string
    category?: ProductCategory
    createdAt: Date
    updatedAt: Date
    StockMovement?: StockMovement[]
  }
  
  export interface StockMovement {
    id: string
    productId: string
    quantity: number
    type: StockType
    note?: string
    userId: string
    createdAt: Date
    product?: Product
    user?: {
      id: string
      firstName?: string
      lastName?: string
      email: string
    }
  }
  
  export enum StockType {
    ENTRY = "ENTRY",
    EXIT = "EXIT",
    ADJUSTMENT = "ADJUSTMENT",
    SALE = "SALE",
    RETURN = "RETURN",
  }
  
  export interface CreateProductData {
    name: string
    description?: string
    photos: string[]
    prixVente: number
    prixAchat: number
    tva: number
    stock: number
    categoryId?: string
  }
  
  export interface UpdateProductData extends CreateProductData {
    id: string
  }
  
  export interface ProductFilters {
    search?: string
    categoryId?: string
    minPrice?: number
    maxPrice?: number
    inStock?: boolean
  }
  
  export interface CreateCategoryData {
    name: string
    description?: string
    parentId?: string | null
  }
  
  export interface UpdateCategoryData extends CreateCategoryData {
    id: string
  }
  