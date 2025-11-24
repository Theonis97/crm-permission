import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/stores/[id]/roles/[roleId] - Récupérer un rôle spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, roleId } = await params

    const role = await prisma.storeRole.findFirst({
      where: {
        id: roleId,
        storeId
      },
      include: {
        storeRolePermissions: {
          include: {
            permission: true
          }
        },
        storeUserRoles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    return NextResponse.json(role)
  } catch (error) {
    console.error("Error fetching store role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/stores/[id]/roles/[roleId] - Mettre à jour un rôle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, roleId } = await params
    const { name, description, permissions } = await request.json()

    // Vérifier que le rôle existe et appartient au magasin
    const existingRole = await prisma.storeRole.findFirst({
      where: {
        id: roleId,
        storeId
      }
    })

    if (!existingRole) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Vérifier que le nom n'est pas déjà utilisé par un autre rôle du même magasin
    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.storeRole.findFirst({
        where: {
          name,
          storeId,
          id: { not: roleId }
        }
      })

      if (nameConflict) {
        return NextResponse.json(
          { error: "Role name already exists in this store" },
          { status: 400 }
        )
      }
    }

    // Mettre à jour le rôle
    const updatedRole = await prisma.$transaction(async (tx) => {
      // Mettre à jour les informations de base
      const role = await tx.storeRole.update({
        where: { id: roleId },
        data: {
          name: name || existingRole.name,
          description: description !== undefined ? description : existingRole.description
        }
      })

      // Mettre à jour les permissions si fournies
      if (permissions) {
        // Supprimer toutes les permissions actuelles
        await tx.storeRolePermission.deleteMany({
          where: { roleId }
        })

        // Ajouter les nouvelles permissions
        if (permissions.length > 0) {
          await tx.storeRolePermission.createMany({
            data: permissions.map((permissionId: string) => ({
              roleId,
              permissionId
            }))
          })
        }
      }

      // Retourner le rôle avec ses permissions
      return await tx.storeRole.findUnique({
        where: { id: roleId },
        include: {
          storeRolePermissions: {
            include: {
              permission: true
            }
          }
        }
      })
    })

    return NextResponse.json(updatedRole)
  } catch (error) {
    console.error("Error updating store role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/stores/[id]/roles/[roleId] - Supprimer un rôle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roleId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, roleId } = await params

    // Vérifier que le rôle existe et appartient au magasin
    const role = await prisma.storeRole.findFirst({
      where: {
        id: roleId,
        storeId
      },
      include: {
        _count: {
          select: {
            storeUserRoles: true
          }
        }
      }
    })

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 })
    }

    // Empêcher la suppression des rôles système
    if (role.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system role" },
        { status: 400 }
      )
    }

    // Empêcher la suppression si des utilisateurs ont ce rôle
    if (role._count.storeUserRoles > 0) {
      return NextResponse.json(
        { error: "Cannot delete role that is assigned to users" },
        { status: 400 }
      )
    }

    // Supprimer le rôle (les permissions seront supprimées automatiquement via CASCADE)
    await prisma.storeRole.delete({
      where: { id: roleId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting store role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
