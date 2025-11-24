import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/stores/[id]/roles - Récupérer tous les rôles d'un magasin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Vérifier que le magasin existe et que l'utilisateur y a accès
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      include: {
        manager: true
      }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Récupérer tous les rôles du magasin avec leurs permissions
    const roles = await prisma.storeRole.findMany({
      where: { storeId },
      include: {
        storeRolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            storeUserRoles: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    })

    return NextResponse.json(roles)
  } catch (error) {
    console.error("Error fetching store roles:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST /api/stores/[id]/roles - Créer un nouveau rôle pour le magasin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId } = await params
    const { name, description, permissions } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Role name is required" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Vérifier que le nom du rôle n'existe pas déjà dans ce magasin
    const existingRole = await prisma.storeRole.findUnique({
      where: {
        name_storeId: {
          name,
          storeId
        }
      }
    })

    if (existingRole) {
      return NextResponse.json(
        { error: "Role name already exists in this store" },
        { status: 400 }
      )
    }

    // Créer le rôle avec ses permissions
    const role = await prisma.storeRole.create({
      data: {
        name,
        description,
        storeId,
        storeRolePermissions: {
          create: permissions?.map((permissionId: string) => ({
            permissionId
          })) || []
        }
      },
      include: {
        storeRolePermissions: {
          include: {
            permission: true
          }
        }
      }
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error("Error creating store role:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
