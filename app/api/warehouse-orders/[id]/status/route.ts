import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

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
    const body = await request.json()
    const { status } = body

    // Validation du statut
    const validStatuses = ["PENDING", "APPROVED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      )
    }

    // Vérifier que la commande existe
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
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

    // Ne pas permettre de changer le statut d'une commande livrée ou annulée
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Impossible de modifier le statut d'une commande livrée ou annulée" },
        { status: 400 }
      )
    }

    // Si on passe en DELIVERED, on met à jour la date de livraison
    const updateData: any = { status }
    if (status === "DELIVERED" && !order.deliveredAt) {
      updateData.deliveredAt = new Date()
    }

    // Mettre à jour le statut
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        store: true,
        items: {
          include: {
            product: true,
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

    // 🔥 IMPORTANT: NE PAS modifier le stock ici !
    // Le stock du magasin est incrémenté UNIQUEMENT quand le magasin marque la commande comme DELIVERED
    // via la route /api/restocking-orders/[id]/status
    // L'entrepôt (warehouse) ne fait que changer le statut (APPROVED, PREPARING, SHIPPED)
    // sans toucher au stock du magasin
    
    // Log pour traçabilité
    if (status === "APPROVED") {
      console.log(`📋 Commande ${order.id} approuvée par l'entrepôt - Stock magasin NON modifié (sera modifié à la livraison)`)
    } else if (status === "PREPARING") {
      console.log(`📦 Commande ${order.id} en préparation - Stock magasin NON modifié`)
    } else if (status === "SHIPPED") {
      console.log(`🚚 Commande ${order.id} expédiée - Stock magasin NON modifié (sera modifié à la réception par le magasin)`)
    }

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error("Error updating order status:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    )
  }
}
