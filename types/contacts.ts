export type ContactType = "PERSONNE" | "ENTREPRISE"
export type ContactStatus = "PROSPECT" | "CLIENT" | "LEAD" | "ARCHIVE"

export interface Contact {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  photo: string | null
  job: string | null
  description: string | null
  tags: string[]
  assignedUserId: string
  assignedUser?: {
    id: string
    firstName: string | null
    lastName: string | null
    email: string
  }
  type: ContactType
  status: ContactStatus
  createdAt: Date
  updatedAt: Date
}

export interface ContactFilters {
  search?: string
  type?: ContactType
  status?: ContactStatus
  assignedUserId?: string
  tags?: string[]
}

export interface CreateContactData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  photo?: string
  job?: string
  description?: string
  tags: string[]
  assignedUserId: string
  type: ContactType
  status: ContactStatus
}

export interface UpdateContactData extends Partial<CreateContactData> {
  id: string
}
