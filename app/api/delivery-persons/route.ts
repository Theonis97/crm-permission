import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer tous les livreurs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    // Date du jour (début et fin)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: storeId ? { storeId } : undefined,
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
      orderBy: {
        name: "asc",
      },
    })

    // Ajouter les statistiques du jour pour chaque livreur
    const deliveryPersonsWithStats = await Promise.all(
      deliveryPersons.map(async (person) => {
        // Commandes du jour
        const todayOrders = await prisma.order.findMany({
          where: {
            deliveryPersonId: person.id,
            createdAt: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          select: {
            status: true,
            total: true,
            deliveryFee: true,
          },
        })

        // Statistiques du jour
        const deliveredToday = todayOrders.filter(o => o.status === "DELIVERED").length
        const deliveringToday = todayOrders.filter(o => o.status === "DELIVERING").length
        const pendingToday = todayOrders.filter(o => 
          ["PENDING", "CONFIRMED", "PREPARING", "READY"].includes(o.status)
        ).length

        const todayRevenue = todayOrders
          .filter(o => o.status === "DELIVERED")
          .reduce((sum, order) => sum + order.total, 0)

        return {
          ...person,
          todayStats: {
            delivered: deliveredToday,
            delivering: deliveringToday,
            pending: pendingToday,
            revenue: todayRevenue,
          },
        }
      })
    )

    return NextResponse.json(deliveryPersonsWithStats)
  } catch (error: any) {
    console.error("Error fetching delivery persons:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau livreur
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
      phone,
      email,
      avatar,
      vehicle,
      plateNumber,
      status,
    } = body

    // Validation
    if (!storeId || !name || !phone) {
      return NextResponse.json(
        { error: "Données invalides. Le nom et le téléphone sont requis." },
        { status: 400 }
      )
    }

    const deliveryPerson = await prisma.deliveryPerson.create({
      data: {
        storeId,
        name,
        phone,
        email,
        avatar,
        vehicle,
        plateNumber,
        status: status || "AVAILABLE",
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
      },
    })

    return NextResponse.json(deliveryPerson, { status: 201 })
  } catch (error: any) {
    console.error("Error creating delivery person:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création" },
      { status: 500 }
    )
  }
}
