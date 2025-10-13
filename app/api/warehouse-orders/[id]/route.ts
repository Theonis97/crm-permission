import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(
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

    if (!user || !hasPermission(user, "warehouse.orders.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id } = await params

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        store: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la commande" },
      { status: 500 }
    )
  }
}

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

    if (!user || !hasPermission(user, "warehouse.orders.update")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id } = await params
    const data = await request.json()
    const { status } = data

    if (!status) {
      return NextResponse.json(
        { error: "Le statut est requis" },
        { status: 400 }
      )
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        store: true,
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    )
  }
}
