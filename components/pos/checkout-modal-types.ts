export interface CartItem {
  product: {
    id: string
    name: string
    prixVente: number
    tva: number
  }
  quantity: number
}

export interface Contact {
  id: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  email: string | null
  status: string
  type: string
}

export interface StoreContact {
  id: string
  storeId: string
  contactId: string
  totalOrders: number
  totalSpent: number
  lastOrderAt: string | null
  contact: Contact
}

export interface DeliveryPerson {
  id: string
  name: string
  phone: string
  status: "AVAILABLE" | "BUSY" | "OFFLINE"
}

export interface DeliveryZone {
  id: string
  name: string
  deliveryFee: number
  estimatedTime?: number
  coordinates: any
}

export interface AddressSuggestion {
  display_name: string
  lat: string
  lon: string
  address?: {
    road?: string
    suburb?: string
    neighbourhood?: string
    city?: string
    town?: string
  }
}

export interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  cart: CartItem[]
  storeId: string
  contacts: StoreContact[]  // Utilise StoreContact au lieu de Contact
  deliveryPersons: DeliveryPerson[]
  deliveryZones: DeliveryZone[]
  onOrderCreated: () => void
}

export const paymentMethods = [
  { id: "cash", label: "Espèces" },
  { id: "card", label: "Carte" },
  { id: "mobile", label: "Mobile Money" },
]
