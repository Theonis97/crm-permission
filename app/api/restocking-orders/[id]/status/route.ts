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
    const { status, rejectionReason } = body

    // Validation du statut
    const validStatuses = ["PENDING", "APPROVED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED", "REJECTED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Statut invalide" },
        { status: 400 }
      )
    }

    // Vérifier que la commande existe
    const order = await prisma.restockingOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: "Commande d'approvisionnement introuvable" },
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

    // Préparer les données de mise à jour
    const updateData: any = { status }

    // Si approuvée
    if (status === "APPROVED" && !order.approvedAt) {
      updateData.approvedAt = new Date()
      updateData.approvedBy = user.id
    }

    // Si livrée
    if (status === "DELIVERED" && !order.deliveredAt) {
      updateData.deliveredAt = new Date()
    }

    // Si rejetée
    if (status === "REJECTED") {
      updateData.rejectionReason = rejectionReason || "Non spécifié"
    }

    // Mettre à jour le statut
    const updatedOrder = await prisma.restockingOrder.update({
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
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // 🔥 IMPORTANT: Créer/Mettre à jour les StoreProduct quand la commande est approuvée ou livrée
    if (status === "APPROVED" || status === "DELIVERED") {
      for (const item of order.items) {
        // Vérifier si le produit existe déjà dans le magasin
        const existingStoreProduct = await prisma.storeProduct.findFirst({
          where: {
            storeId: order.storeId,
            productId: item.productId,
          },
        })

        if (existingStoreProduct) {
          // Mettre à jour le stock existant (ajouter la quantité)
          await prisma.storeProduct.update({
            where: { id: existingStoreProduct.id },
            data: {
              stock: existingStoreProduct.stock + item.requestedQuantity,
            },
          })
        } else {
          // Créer un nouveau StoreProduct pour ce magasin
          await prisma.storeProduct.create({
            data: {
              storeId: order.storeId,
              productId: item.productId,
              stock: item.requestedQuantity,
              minStock: 10, // Valeur par défaut
            },
          })
        }
      }
    }

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error("Error updating restocking order status:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour du statut" },
      { status: 500 }
    )
  }
}
