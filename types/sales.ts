export enum QuoteStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  VIEWED = "VIEWED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  EXPIRED = "EXPIRED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export interface QuoteItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  productId?: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  discount: number
  total: number
  productId?: string
}

export interface Quote {
  id: string
  number: string
  title: string
  status: QuoteStatus
  contactId: string
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
    job?: string
  }
  items: QuoteItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  notes?: string
  terms?: string
  validUntil: Date
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  number: string
  title: string
  status: InvoiceStatus
  contactId: string
  contact: {
    id: string
    firstName: string
    lastName: string
    email: string
    job?: string
  }
  items: InvoiceItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  discount: number
  total: number
  notes?: string
  terms?: string
  dueDate: Date
  quoteId?: string
  createdAt: Date
  updatedAt: Date
}

export interface SalesStats {
  totalQuotes: number
  totalInvoices: number
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  conversionRate: number
}
