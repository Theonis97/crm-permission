import { prisma } from "@/lib/prisma"
import { hasPermission, hasGlobalOrStorePermission } from "@/lib/auth-helpers"

/** Noms de permissions acceptés pour le rôle livreur (compatibilité ancien + nouveau schéma). */
export const DRIVER_PERM_NAMES = ["driver.restock", "livreur.access"] as const

/**
 * Vérifie si un utilisateur possède directement le rôle/la permission livreur
 * (driver.restock ou livreur.access dans ses rôles globaux).
 * N'exige PAS d'être admin / gestionnaire.
 */
export async function userHasLivreurRoleAccess(userId: string): Promise<boolean> {
  try {
    const count = await prisma.userRole.count({
      where: {
        userId,
        role: {
          rolePermissions: {
            some: {
              permission: {
                name: { in: [...DRIVER_PERM_NAMES] },
              },
            },
          },
        },
      },
    })
    return count > 0
  } catch {
    return false
  }
}

/**
 * Accès « back-office » au portail réappro livreur (admins / gestionnaires magasin).
 * Ne couvre PAS les utilisateurs avec le simple rôle Livreur — utiliser
 * `userHasLivreurRoleAccess` pour eux.
 */
export async function userHasDriverRestockStaffAccess(userId: string): Promise<boolean> {
  if (await hasPermission(userId, "users.view")) return true
  if (await hasPermission(userId, "roles.view")) return true
  if (await hasGlobalOrStorePermission(userId, "stores.manage", "store.settings.edit")) return true
  if (await hasGlobalOrStorePermission(userId, "stores.update", "store.settings.edit")) return true
  return false
}

/**
 * Accès complet : livreur (email) OU rôle livreur OU gestionnaire staff.
 * C'est le seul vrai garde-fou à utiliser dans les routes /api/driver/restock/*.
 */
export async function userCanAccessDriverRestock(
  userId: string,
  userEmail: string | null | undefined,
): Promise<{ allowed: boolean; reason: "driver_email" | "livreur_role" | "staff" | "denied" }> {
  // 1. Livreur fiche (email)
  if (userEmail?.trim()) {
    const { getActiveDeliveryPersonByUserEmail } = await import("@/lib/driver-session")
    const dp = await getActiveDeliveryPersonByUserEmail(userEmail)
    if (dp) return { allowed: true, reason: "driver_email" }
  }

  // 2. Rôle Livreur (driver.restock ou livreur.access)
  if (await userHasLivreurRoleAccess(userId)) {
    return { allowed: true, reason: "livreur_role" }
  }

  // 3. Staff (admin / gestionnaire)
  if (await userHasDriverRestockStaffAccess(userId)) {
    return { allowed: true, reason: "staff" }
  }

  return { allowed: false, reason: "denied" }
}
