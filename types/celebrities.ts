// Types pour les célébrités et commandes

export interface Celebrity {
  id: string
  name: string
  slug: string
  profileImage: string
  coverImage: string
  category: string
  rating: number
  reviewCount: number
  price: number
  currency: string
  description: string
  specialties: string[]
  responseTime: string
  completedOrders: number
  isVerified: boolean
  isOnline: boolean
  videoSample?: string
}

export interface OrderData {
  occasion: string
  customOccasion?: string
  recipient: 'myself' | 'someone'
  recipientName?: string
  recipientGender?: 'il' | 'elle'
  message: string
  country: string
  paymentMethod: string
}

export interface Occasion {
  id: string
  label: string
  icon: any // Lucide icon component
  color: string
}

export interface Country {
  code: string
  name: string
  currency: string
}

export interface OrderSheetProps {
  isOpen: boolean
  onClose: () => void
  celebrity: Celebrity
}

// États du processus de commande
export type OrderStep = 1 | 2 | 3 | 4

export interface OrderFormState {
  currentStep: OrderStep
  data: OrderData
  isValid: boolean
  isSubmitting: boolean
}
