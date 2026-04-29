export interface Product {
  id: string
  storeProductId: string
  name: string
  sku: string | null
  description: string | null
  photos: string[]
  /** Prix utilisé en caisse : tarif magasin s’il existe, sinon référence entrepôt (provisoire). */
  prixVente: number
  prixAchat: number
  tva: number
  stock: number
  minStock: number
  maxStock: number
  categoryId: string
  brandId: string | null
  warehousePrixVente?: number
  category: {
    id: string
    name: string
  }
  brand: {
    id: string
    name: string
  } | null
}

export interface Category {
  id: string
  name: string
  description: string | null
  _count: {
    products: number
  }
}

export interface Brand {
  id: string
  name: string
  description: string | null
  logo: string | null
  _count: {
    products: number
  }
}

export interface DeliveryPerson {
  id: string
  name: string
  phone: string
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
}

export interface CartItem {
  /** Identifiant stable par ligne (plusieurs lignes peuvent partager le même produit, ex. sous-caisse SAV). */
  lineId: string
  product: Product
  quantity: number
  discount?: number // Réduction en pourcentage (0-100)
  discountAmount?: number // Montant de réduction fixe en FCFA
}

export interface Contact {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
}

export interface StoreContact {
  id: string
  contactId: string
  storeId: string
  contact: Contact
}
