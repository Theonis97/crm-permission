import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/stores/[id]/users/[userId]/roles - Récupérer les rôles d'un utilisateur dans un magasin
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
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Récupérer les rôles de l'utilisateur dans ce magasin
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
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Extraire toutes les permissions de l'utilisateur
    const permissions = new Set<string>()
    userRoles.forEach(userRole => {
      userRole.role.storeRolePermissions.forEach(rp => {
        permissions.add(rp.permission.name)
      })
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      },
      roles: userRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        isSystem: ur.role.isSystem,
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedByUser,
        permissions: ur.role.storeRolePermissions.map(rp => rp.permission)
      })),
      permissions: Array.from(permissions)
    })
  } catch (error) {
    console.error("Error fetching user store roles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id]/users/[userId]/roles - Mettre à jour les rôles d'un utilisateur dans un magasin
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, userId } = await params
    const { roleIds } = await request.json()

    if (!Array.isArray(roleIds)) {
      return NextResponse.json(
        { error: "roleIds must be an array" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Si roleIds n'est pas vide, vérifier que tous les rôles existent et appartiennent au magasin
    if (roleIds.length > 0) {
      const roles = await prisma.storeRole.findMany({
        where: {
          id: { in: roleIds },
          storeId
        }
      })

      if (roles.length !== roleIds.length) {
        return NextResponse.json(
          { error: "One or more roles not found in this store" },
          { status: 400 }
        )
      }
    }

    // Mettre à jour les rôles de l'utilisateur dans ce magasin
    await prisma.$transaction(async (tx) => {
      // Supprimer tous les rôles actuels de l'utilisateur dans ce magasin
      await tx.storeUserRole.deleteMany({
        where: {
          userId,
          storeId
        }
      })

      // Ajouter les nouveaux rôles
      if (roleIds.length > 0) {
        await tx.storeUserRole.createMany({
          data: roleIds.map((roleId: string) => ({
            userId,
            storeId,
            roleId,
            assignedBy: session.user.id
          }))
        })
      }
    })

    // Retourner les rôles mis à jour
    const updatedUserRoles = await prisma.storeUserRole.findMany({
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
        },
        assignedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      roles: updatedUserRoles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description,
        isSystem: ur.role.isSystem,
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedByUser,
        permissions: ur.role.storeRolePermissions.map(rp => rp.permission)
      }))
    })
  } catch (error) {
    console.error("Error updating user store roles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id]/users/[userId]/roles - Supprimer tous les rôles d'un utilisateur dans un magasin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, userId } = await params

    // Supprimer tous les rôles de l'utilisateur dans ce magasin
    await prisma.storeUserRole.deleteMany({
      where: {
        userId,
        storeId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing user from store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
