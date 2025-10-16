import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// GET - Récupérer les détails d'un livreur
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

    // Récupérer le livreur avec toutes ses relations
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
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
            storeOrders: true,
          },
        },
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Date du jour
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    // Commandes en cours et du jour
    const todayOrders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: id,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        status: true,
      },
    })

    // Calculer les statistiques du jour
    const activeDeliveries = todayOrders.filter(o => 
      o.status === "DELIVERING"
    ).length

    // Récupérer le résumé du stock
    const stock = await prisma.deliveryPersonStock.findMany({
      where: {
        deliveryPersonId: id,
      },
      include: {
        product: {
          select: {
            prixVente: true,
          },
        },
        variant: {
          select: {
            prixVente: true,
          },
        },
      },
    })

    const totalItems = stock.reduce((sum, item) => sum + item.quantity, 0)
    const stockValue = stock.reduce((sum, item) => {
      const price = item.variant?.prixVente || item.product.prixVente
      return sum + price * item.quantity
    }, 0)

    return NextResponse.json({
      ...deliveryPerson,
      activeDeliveries,
      stockValue,
      totalDeliveries: deliveryPerson._count.storeOrders,
    })
  } catch (error: any) {
    console.error("Error fetching delivery person:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération" },
      { status: 500 }
    )
  }
}

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
            storeOrders: true,
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
