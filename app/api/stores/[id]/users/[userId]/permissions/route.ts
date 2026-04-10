import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/** Permissions globales qui donnent un accès complet au tableau de bord magasin. */
const GLOBAL_ADMIN_PERMS = [
  "stores.manage",
  "stores.view",
  "roles.view",
  "users.view",
  "orders.view",
]

/** Toutes les permissions de niveau magasin accordées aux admins globaux. */
const ALL_STORE_PERMISSIONS = [
  "store.dashboard.view",
  "store.products.view",
  "store.products.create",
  "store.products.edit",
  "store.products.delete",
  "store.products.stock",
  "store.categories.view",
  "store.categories.manage",
  "store.brands.view",
  "store.brands.manage",
  "store.orders.view",
  "store.orders.create",
  "store.orders.edit",
  "store.orders.cancel",
  "store.orders.fulfill",
  "store.pos.access",
  "store.pos.sell",
  "store.pos.refund",
  "store.contacts.view",
  "store.contacts.create",
  "store.contacts.edit",
  "store.contacts.delete",
  "store.drivers.view",
  "store.drivers.manage",
  "store.drivers.assign",
  "store.zones.view",
  "store.zones.manage",
  "store.movements.view",
  "store.movements.create",
  "store.sav.view",
  "store.sav.create",
  "store.sav.process",
  "store.users.view",
  "store.users.invite",
  "store.users.roles",
  "store.settings.edit",
  "store.expenses.view",
  "store.expenses.create",
  "store.expenses.edit",
  "store.expenses.delete",
  "store.expenses.approve",
]

/**
 * GET /api/stores/[id]/users/[userId]/permissions
 * Permissions d'un utilisateur dans un magasin donné.
 * Robuste : fonctionne même si les tables store_role_permissions ne sont pas migrées.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, userId } = await params

    // ── 1. Vérifier que l'utilisateur existe ─────────────────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, image: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const permissionsSet = new Set<string>()
    const rolesInfo: { id: string; name: string; description: string | null; isSystem: boolean }[] = []

    // ── 2. Permissions via rôles magasin (tables store_user_roles) ───────────
    try {
      const userRoles = await prisma.storeUserRole.findMany({
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

      userRoles.forEach((ur) => {
        rolesInfo.push({
          id: ur.role.id,
          name: ur.role.name,
          description: ur.role.description,
          isSystem: ur.role.isSystem,
        })
        ur.role.storeRolePermissions.forEach((rp) => {
          permissionsSet.add(rp.permission.name)
        })
      })
    } catch {
      // Les tables store_role_permissions / store_permissions ne sont peut-être
      // pas encore migrées — on continue sans elles.
    }

    // ── 3. Vérifier si l'utilisateur est admin global ────────────────────────
    let isGlobalAdmin = false
    try {
      const userWithRoles = await prisma.user.findUnique({
        where: { id: userId },
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

      if (userWithRoles?.userRoles) {
        const globalPerms = new Set(
          userWithRoles.userRoles.flatMap((ur) =>
            ur.role.rolePermissions.map((rp) => rp.permission.name),
          ),
        )
        isGlobalAdmin = GLOBAL_ADMIN_PERMS.some((p) => globalPerms.has(p))

        if (isGlobalAdmin) {
          // L'admin global hérite de TOUTES les permissions magasin
          ALL_STORE_PERMISSIONS.forEach((p) => permissionsSet.add(p))
        }
      }
    } catch {
      // Ignorer les erreurs de la vérification globale
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email,
        email: user.email,
        image: user.image,
      },
      permissions: Array.from(permissionsSet),
      roles: rolesInfo,
      hasStoreAccess: permissionsSet.size > 0 || rolesInfo.length > 0 || isGlobalAdmin,
    })
  } catch (error) {
    console.error("Error fetching user store permissions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
