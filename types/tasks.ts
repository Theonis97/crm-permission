export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  userId: string
  opportunityId?: string
  startDate?: Date
  dueDate?: Date
  createdAt: Date
  updatedAt: Date
  user?: {
    id: string
    name: string
    email: string
  }
  opportunity?: {
    id: string
    title: string
  }
}

export interface TaskFilters {
  status?: TaskStatus[]
  userId?: string[]
  opportunityId?: string
  dueDateFrom?: Date
  dueDateTo?: Date
  search?: string
}

export interface TaskStats {
  total: number
  todo: number
  inProgress: number
  completed: number
  overdue: number
}
