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
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  try {
    console.log(`Checking permission "${permission}" for user ${userId}`)

    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
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
      console.log(`User ${userId} not found`)
      return false
    }

    console.log(`User ${userId} has ${userWithRoles.userRoles.length} roles`)

    // Vérifier si l'utilisateur a la permission
    for (const userRole of userWithRoles.userRoles) {
      console.log(`Checking role: ${userRole.role.name}`)
      for (const rolePermission of userRole.role.rolePermissions) {
        console.log(`  - Permission: ${rolePermission.permission.name}`)
        if (rolePermission.permission.name === permission) {
          console.log(`✅ Permission "${permission}" found for user ${userId}`)
          return true
        }
      }
    }

    console.log(`❌ Permission "${permission}" NOT found for user ${userId}`)
    return false
  } catch (error) {
    console.error("Error checking permission:", error)
    return false
  }
}

/**
 * Vérifie si un utilisateur a au moins une des permissions spécifiées
 */
export async function hasAnyPermission(userId: string, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, permission)) {
      return true
    }
  }
  return false
}

/**
 * Vérifie si un utilisateur a toutes les permissions spécifiées
 */
export async function hasAllPermissions(userId: string, permissions: string[]): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, permission))) {
      return false
    }
  }
  return true
}
