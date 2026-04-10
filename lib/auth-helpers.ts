import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

/**
 * Helper pour obtenir une session authentifiée côté serveur
 * Retourne la session ou une réponse d'erreur 401
 */
export async function getAuthenticatedSession() {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.id) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return {
    session,
    error: null,
  }
}

/**
 * Type guard pour vérifier qu'une session est valide
 */
export function isValidSession(session: any): session is { user: { id: string; email: string; name?: string } } {
  return session && session.user && typeof session.user.id === "string"
}

/**
 * Vérifie si un utilisateur a une permission spécifique.
 * Accepte soit un ID utilisateur (string), soit un objet utilisateur complet avec userRoles.
 */
export async function hasPermission(userOrId: string | any, permission: string): Promise<boolean> {
  try {
    let userWithRoles: any

    if (typeof userOrId === "string") {
      userWithRoles = await prisma.user.findUnique({
        where: { id: userOrId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!userWithRoles) return false
    } else {
      userWithRoles = userOrId
    }

    if (!userWithRoles?.userRoles) return false

    for (const userRole of userWithRoles.userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        if (rolePermission.permission.name === permission) return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées.
 */
export async function hasAnyPermission(userOrId: string | any, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userOrId, permission)) return true
  }
  return false
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées.
 */
export async function hasAllPermissions(userOrId: string | any, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userOrId, permission))) return false
  }
  return true
}

/**
 * Vérifie si un utilisateur a une permission globale OU une permission de magasin.
 */
export async function hasGlobalOrStorePermission(
  userId: string,
  globalPermission: string,
  storePermission: string,
): Promise<boolean> {
  try {
    const hasGlobal = await hasPermission(userId, globalPermission)
    if (hasGlobal) return true

    const userWithStoreRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeUserRoles: {
          include: {
            role: {
              include: {
                storeRolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    })

    if (!userWithStoreRoles?.storeUserRoles?.length) return false

    for (const storeUserRole of userWithStoreRoles.storeUserRoles) {
      for (const rolePermission of storeUserRole.role.storeRolePermissions) {
        if (rolePermission.permission.name === storePermission) return true
      }
    }

    return false
  } catch (error) {
    console.error("Error checking global or store permission:", error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a une permission spécifique pour un magasin donné.
 */
export async function hasStorePermission(userId: string, storeId: string, permission: string): Promise<boolean> {
  try {
    const userWithStoreRole = await prisma.storeUserRole.findFirst({
      where: { userId, storeId },
      include: {
        role: {
          include: {
            storeRolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    })

    if (!userWithStoreRole) return false

    for (const rolePermission of userWithStoreRole.role.storeRolePermissions) {
      if (rolePermission.permission.name === permission) return true
    }

    return false
  } catch (error) {
    console.error("Error checking store permission:", error)
    return false
  }
}
