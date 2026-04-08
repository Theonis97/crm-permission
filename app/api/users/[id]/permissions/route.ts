import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isPrismaDatabaseConnectionError } from "@/lib/prisma-errors"
import { getActiveDeliveryPersonByUserEmail } from "@/lib/driver-session"
import { userHasDriverRestockStaffAccess, userHasLivreurRoleAccess, DRIVER_PERM_NAMES } from "@/lib/driver-restock-access"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Get user with roles and permissions (global + store-specific)
    const user = await prisma.user.findUnique({
      where: { id },
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
        storeUserRoles: {
          include: {
            store: {
              select: {
                id: true,
                name: true,
              },
            },
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

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Extract global permissions
    const permissions = new Set<string>()
    user.userRoles.forEach((userRole) => {
      userRole.role.rolePermissions.forEach((rolePermission) => {
        permissions.add(rolePermission.permission.name)
      })
    })

    // Extract store permissions and store access
    const storePermissions = new Set<string>()
    const userStores: Array<{ id: string; name: string; roles: string[] }> = []
    
    user.storeUserRoles.forEach((storeUserRole) => {
      // Add store permissions
      storeUserRole.role.storeRolePermissions.forEach((rolePermission) => {
        storePermissions.add(rolePermission.permission.name)
      })
      
      // Track user stores
      const existingStore = userStores.find(s => s.id === storeUserRole.store.id)
      if (existingStore) {
        existingStore.roles.push(storeUserRole.role.name)
      } else {
        userStores.push({
          id: storeUserRole.store.id,
          name: storeUserRole.store.name,
          roles: [storeUserRole.role.name]
        })
      }
    })

    // If user has access to any store, grant basic stores.view permission
    if (userStores.length > 0) {
      permissions.add("stores.view")
    }

    // Combine all permissions
    const allPermissions = new Set([...permissions, ...storePermissions])

    const deliveryProfile = await getActiveDeliveryPersonByUserEmail(user.email)
    const staffDriverRestock = await userHasDriverRestockStaffAccess(user.id)
    // Rôle Livreur direct (driver.restock ou livreur.access dans les rôles globaux)
    const hasLivreurRole = [...DRIVER_PERM_NAMES].some((p) => allPermissions.has(p))
      || await userHasLivreurRoleAccess(user.id)
    if (deliveryProfile || staffDriverRestock || hasLivreurRole) {
      allPermissions.add("driver.restock")
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
      permissions: Array.from(allPermissions),
      stores: userStores,
      deliveryProfile: deliveryProfile
        ? {
            id: deliveryProfile.id,
            name: deliveryProfile.name,
            phone: deliveryProfile.phone,
            defaultStoreId: deliveryProfile.storeId,
          }
        : null,
    })
  } catch (error) {
    console.error("Error fetching user permissions:", error)
    if (isPrismaDatabaseConnectionError(error)) {
      return NextResponse.json(
        {
          error: "Database unavailable",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
