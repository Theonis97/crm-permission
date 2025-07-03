import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const roleId = params.id
    const { name, description } = await request.json()

    const role = await prisma.role.update({
      where: { id: roleId },
      data: {
        name,
        description,
        updatedAt: new Date(),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
    })

    return NextResponse.json(role)
  } catch (error) {
    console.error("Error updating role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const roleId = params.id

    // Vérifier si le rôle est un rôle système
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    })

    if (role?.isSystem) {
      return NextResponse.json({ error: "Cannot delete system role" }, { status: 400 })
    }

    await prisma.role.delete({
      where: { id: roleId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting role:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
