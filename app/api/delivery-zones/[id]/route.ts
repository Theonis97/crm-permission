import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer une zone spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    const zone = await prisma.deliveryZone.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
            avatar: true,
          },
        },
      },
    })

    if (!zone) {
      return NextResponse.json(
        { error: "Zone introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json(zone)
  } catch (error: any) {
    console.error("Error fetching delivery zone:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

// PATCH - Mettre à jour une zone
export async function PATCH(
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
      color,
      coverage,
      coordinates,
      deliveryFee,
      estimatedTime,
      deliveryPersonId,
      isActive,
    } = body

    // Si les coordonnées changent, recalculer le centre
    let updateData: any = {
      name,
      color,
      coverage,
      deliveryFee,
      estimatedTime,
      deliveryPersonId,
      isActive,
    }

    if (coordinates && coordinates.length >= 3) {
      const centerLat = coordinates.reduce((sum: number, point: any) => sum + point.lat, 0) / coordinates.length
      const centerLng = coordinates.reduce((sum: number, point: any) => sum + point.lng, 0) / coordinates.length
      
      updateData.coordinates = coordinates
      updateData.centerLatitude = centerLat
      updateData.centerLongitude = centerLng
    }

    // Supprimer les undefined
    Object.keys(updateData).forEach(key => 
      updateData[key] === undefined && delete updateData[key]
    )

    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: updateData,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(zone)
  } catch (error: any) {
    console.error("Error updating delivery zone:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une zone
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

    await prisma.deliveryZone.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Zone supprimée avec succès" })
  } catch (error: any) {
    console.error("Error deleting delivery zone:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
