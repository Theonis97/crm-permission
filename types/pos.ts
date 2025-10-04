export interface POSProduct {
  id: string
  name: string
  price: number
  image: string
  category: string
  description?: string
}

export interface POSOrderItem {
  id: string
  productId: string
  name: string
  price: number
  quantity: number
  total: number
}

export interface POSOrder {
  id: string
  items: POSOrderItem[]
  subtotal: number
  serviceCharge: number
  tax: number
  total: number
  customerName?: string
  customerPhone?: string
  orderType: "takeaway" | "delivery" | "dine-in"
}

export interface POSCategory {
  id: string
  name: string
  icon?: string
}
