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
 * Vérifie si un utilisateur a une permission spécifique
 * Accepte soit un ID utilisateur (string), soit un objet utilisateur complet avec userRoles
 */
export async function hasPermission(userOrId: string | any, permission: string): Promise<boolean> {
  try {
    let userWithRoles: any

    // Si c'est une string, c'est un ID - faire la requête
    if (typeof userOrId === 'string') {
      console.log(`Checking permission "${permission}" for user ID ${userOrId}`)
      
      userWithRoles = await prisma.user.findUnique({
        where: { id: userOrId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      })

      if (!userWithRoles) {
        console.log(`User ${userOrId} not found`)
        return false
      }
    } else {
      // C'est déjà un objet utilisateur avec les rôles chargés
      userWithRoles = userOrId
      console.log(`Checking permission "${permission}" for user object ${userWithRoles.id || 'unknown'}`)
    }

    if (!userWithRoles || !userWithRoles.userRoles) {
      console.log(`User has no roles`)
      return false
    }

    console.log(`User has ${userWithRoles.userRoles.length} roles`)

    // Vérifier si l'utilisateur a la permission
    for (const userRole of userWithRoles.userRoles) {
      console.log(`Checking role: ${userRole.role.name}`)
      for (const rolePermission of userRole.role.rolePermissions) {
        console.log(`  - Permission: ${rolePermission.permission.name}`)
        if (rolePermission.permission.name === permission) {
          console.log(`✅ Permission "${permission}" found`)
          return true
        }
      }
    }

    console.log(`❌ Permission "${permission}" NOT found`)
    return false
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées
 */
export async function hasAnyPermission(userOrId: string | any, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userOrId, permission)) {
      return true
    }
  }
  return false
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées
 */
export async function hasAllPermissions(userOrId: string | any, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userOrId, permission))) {
      return false
    }
  }
  return true
}

/**
 * Vérifie si un utilisateur a une permission globale OU une permission de magasin
 * Utile pour les endpoints qui peuvent être utilisés depuis le dashboard global ou depuis un magasin
 */
export async function hasGlobalOrStorePermission(userId: string, globalPermission: string, storePermission: string): Promise<boolean> {
  try {
    console.log(`Checking global permission "${globalPermission}" OR store permission "${storePermission}" for user ${userId}`)
    
    // Vérifier d'abord la permission globale
    const hasGlobal = await hasPermission(userId, globalPermission)
    if (hasGlobal) {
      console.log(`✅ User has global permission "${globalPermission}"`)
      return true
    }

    // Si pas de permission globale, vérifier les permissions de magasin
    const userWithStoreRoles = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        storeUserRoles: {
          include: {
            role: {
              include: {
                storeRolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!userWithStoreRoles || !userWithStoreRoles.storeUserRoles) {
      console.log(`User has no store roles`)
      return false
    }

    console.log(`User has ${userWithStoreRoles.storeUserRoles.length} store roles`)

    // Vérifier si l'utilisateur a la permission dans au moins un magasin
    for (const storeUserRole of userWithStoreRoles.storeUserRoles) {
      console.log(`Checking store role: ${storeUserRole.role.name}`)
      for (const rolePermission of storeUserRole.role.storeRolePermissions) {
        console.log(`  - Store permission: ${rolePermission.permission.name}`)
        if (rolePermission.permission.name === storePermission) {
          console.log(`✅ Store permission "${storePermission}" found`)
          return true
        }
      }
    }

    console.log(`❌ Neither global permission "${globalPermission}" nor store permission "${storePermission}" found`)
    return false
  } catch (error) {
    console.error("Error checking global or store permission:", error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a une permission spécifique pour un magasin donné
 */
export async function hasStorePermission(userId: string, storeId: string, permission: string): Promise<boolean> {
  try {
    console.log(`Checking store permission "${permission}" for user ${userId} in store ${storeId}`)
    
    const userWithStoreRole = await prisma.storeUserRole.findFirst({
      where: {
        userId,
        storeId,
      },
      include: {
        role: {
          include: {
            storeRolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    })

    if (!userWithStoreRole) {
      console.log(`User has no role in store ${storeId}`)
      return false
    }

    // Vérifier si le rôle a la permission
    for (const rolePermission of userWithStoreRole.role.storeRolePermissions) {
      if (rolePermission.permission.name === permission) {
        console.log(`✅ Store permission "${permission}" found`)
        return true
      }
    }

    console.log(`❌ Store permission "${permission}" NOT found`)
    return false
  } catch (error) {
    console.error("Error checking store permission:", error)
    return false
  }
}
