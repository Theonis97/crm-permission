import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer toutes les zones de livraison
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    const zones = await prisma.deliveryZone.findMany({
      where: storeId ? { storeId } : undefined,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(zones)
  } catch (error: any) {
    console.error("Error fetching delivery zones:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle zone de livraison
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      storeId,
      name,
      color,
      coverage,
      coordinates,
      deliveryFee,
      estimatedTime,
      deliveryPersonId,
    } = body

    // Validation
    if (!storeId || !name || !coordinates || coordinates.length < 3) {
      return NextResponse.json(
        { error: "Données invalides. Un polygone nécessite au moins 3 points." },
        { status: 400 }
      )
    }

    // Calculer le centre du polygone
    const centerLat = coordinates.reduce((sum: number, point: any) => sum + point.lat, 0) / coordinates.length
    const centerLng = coordinates.reduce((sum: number, point: any) => sum + point.lng, 0) / coordinates.length

    const zone = await prisma.deliveryZone.create({
      data: {
        storeId,
        name,
        color: color || "#3B82F6",
        coverage,
        coordinates,
        centerLatitude: centerLat,
        centerLongitude: centerLng,
        deliveryFee: deliveryFee || 0,
        estimatedTime,
        deliveryPersonId,
      },
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

    return NextResponse.json(zone, { status: 201 })
  } catch (error: any) {
    console.error("Error creating delivery zone:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
