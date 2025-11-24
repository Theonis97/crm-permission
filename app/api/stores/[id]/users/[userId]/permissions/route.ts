import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET /api/stores/[id]/users/[userId]/permissions - Récupérer les permissions d'un utilisateur dans un magasin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, userId } = await params

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Récupérer toutes les permissions de l'utilisateur dans ce magasin
    const userRoles = await prisma.storeUserRole.findMany({
      where: {
        userId,
        storeId
      },
      include: {
        role: {
          include: {
            storeRolePermissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    // Collecter toutes les permissions uniques
    const permissionsSet = new Set<string>()
    const permissionsDetails: any[] = []
    const rolesInfo: any[] = []

    userRoles.forEach(userRole => {
      rolesInfo.push({
        id: userRole.role.id,
        name: userRole.role.name,
        description: userRole.role.description,
        isSystem: userRole.role.isSystem
      })

      userRole.role.storeRolePermissions.forEach(rp => {
        if (!permissionsSet.has(rp.permission.name)) {
          permissionsSet.add(rp.permission.name)
          permissionsDetails.push(rp.permission)
        }
      })
    })

    // Vérifier les permissions globales pour les actions de base
    const globalPermissions = [
      'products.view',
      'products.create', 
      'products.edit',
      'products.delete',
      'stores.view',
      'dashboard.view'
    ]

    // Mapper les permissions globales vers les permissions de magasin
    const globalToStoreMapping: Record<string, string> = {
      'products.view': 'store.products.view',
      'products.create': 'store.products.create',
      'products.edit': 'store.products.edit',
      'products.delete': 'store.products.delete',
      'stores.view': 'store.dashboard.view',
      'dashboard.view': 'store.dashboard.view'
    }

    // Permissions automatiques pour les utilisateurs avec accès global aux produits
    const autoGrantPermissions: Record<string, string[]> = {
      'products.view': [
        'store.brands.view',
        'store.categories.view',
        'store.dashboard.view'
      ],
      'products.create': [
        'store.brands.manage',
        'store.categories.manage'
      ]
    }

    // Vérifier chaque permission globale et l'ajouter si l'utilisateur l'a
    for (const globalPerm of globalPermissions) {
      const hasGlobalPerm = await hasPermission(userId, globalPerm)
      if (hasGlobalPerm) {
        // Ajouter la permission mappée directement
        const storePerm = globalToStoreMapping[globalPerm]
        if (storePerm && !permissionsSet.has(storePerm)) {
          permissionsSet.add(storePerm)
          permissionsDetails.push({
            id: `global-${globalPerm}`,
            name: storePerm,
            description: `Permission globale mappée: ${globalPerm}`,
            isGlobal: true
          })
        }

        // Ajouter les permissions automatiques
        const autoPerms = autoGrantPermissions[globalPerm]
        if (autoPerms) {
          autoPerms.forEach(autoPerm => {
            if (!permissionsSet.has(autoPerm)) {
              permissionsSet.add(autoPerm)
              permissionsDetails.push({
                id: `auto-${globalPerm}-${autoPerm}`,
                name: autoPerm,
                description: `Permission automatique basée sur: ${globalPerm}`,
                isGlobal: true,
                isAuto: true
              })
            }
          })
        }
      }
    }

    // L'utilisateur a accès au magasin s'il a des rôles spécifiques OU des permissions globales
    const hasGlobalAccess = await hasPermission(userId, 'products.view') || 
                           await hasPermission(userId, 'stores.view')
    
    return NextResponse.json({
      user,
      permissions: Array.from(permissionsSet),
      permissionsDetails,
      roles: rolesInfo,
      hasStoreAccess: userRoles.length > 0 || hasGlobalAccess
    })
  } catch (error) {
    console.error("Error fetching user store permissions:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
