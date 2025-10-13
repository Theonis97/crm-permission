import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// PUT - Mettre à jour un livreur
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    if (!user || !hasPermission(user, "stores.manage")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      phone,
      email,
      avatar,
      vehicle,
      plateNumber,
      status,
      isActive,
    } = body

    const deliveryPerson = await prisma.deliveryPerson.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(email !== undefined && { email }),
        ...(avatar !== undefined && { avatar }),
        ...(vehicle !== undefined && { vehicle }),
        ...(plateNumber !== undefined && { plateNumber }),
        ...(status && { status }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryZones: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    return NextResponse.json(deliveryPerson)
  } catch (error: any) {
    console.error("Error updating delivery person:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un livreur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
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

    if (!user || !hasPermission(user, "stores.manage")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id } = await params

    await prisma.deliveryPerson.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Livreur supprimé avec succès" })
  } catch (error: any) {
    console.error("Error deleting delivery person:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
