import type { User as PrismaUser, Role, Permission, UserRole, RolePermission } from "@prisma/client"

export type User = PrismaUser

export type UserWithRoles = User & {
  userRoles: (UserRole & {
    role: Role
  })[]
}

export type RoleWithPermissions = Role & {
  rolePermissions: (RolePermission & {
    permission: Permission
  })[]
}

export interface UserPermissions {
  user: User | null
  permissions: string[]
  loading: boolean
}
