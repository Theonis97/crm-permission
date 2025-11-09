export type OpportunityStatus = "NEW" | "IN_PROGRESS" | "WON" | "LOST"

export interface Contact {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  photo: string | null
  job: string | null
  assignedUser: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface OpportunityUser {
  id: string
  firstName: string
  lastName: string
  email: string
}

export interface OpportunityParticipant {
  id: string
  userId: string
  user: OpportunityUser
  addedAt: string
}

export interface OpportunityDocument {
  id: string
  name: string
  url: string
  uploadedAt: string
}

export interface Opportunity {
  id: string
  title: string
  description: string | null
  status: OpportunityStatus
  globalAmount: number | null
  finalAmount: number | null
  contactId: string
  ownerId: string
  createdAt: string
  updatedAt: string
  contact: Contact
  owner: OpportunityUser
  participants: OpportunityParticipant[]
  documents: OpportunityDocument[]
  _count?: {
    tasks: number
    invoices: number
    documents: number
  }
}

export interface CreateOpportunityData {
  title: string
  description?: string
  globalAmount?: number
  finalAmount?: number
  contactId: string
  participantIds: string[]
}

export interface UpdateOpportunityData {
  title?: string
  description?: string
  globalAmount?: number
  finalAmount?: number
  status?: OpportunityStatus
  contactId?: string
  participantIds?: string[]
}
