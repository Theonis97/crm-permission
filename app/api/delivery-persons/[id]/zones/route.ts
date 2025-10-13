import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// POST - Assigner des zones à un livreur
export async function POST(
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

    const { id: deliveryPersonId } = await params
    const body = await request.json()
    const { zoneIds } = body

    if (!Array.isArray(zoneIds)) {
      return NextResponse.json(
        { error: "zoneIds doit être un tableau" },
        { status: 400 }
      )
    }

    // Mettre à jour les zones assignées
    await prisma.deliveryZone.updateMany({
      where: {
        deliveryPersonId,
      },
      data: {
        deliveryPersonId: null,
      },
    })

    // Assigner les nouvelles zones
    if (zoneIds.length > 0) {
      await prisma.deliveryZone.updateMany({
        where: {
          id: { in: zoneIds },
        },
        data: {
          deliveryPersonId,
        },
      })
    }

    // Récupérer le livreur mis à jour
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
      include: {
        deliveryZones: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json(deliveryPerson)
  } catch (error: any) {
    console.error("Error assigning zones:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'assignation" },
      { status: 500 }
    )
  }
}
