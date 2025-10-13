import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

// POST - Actions groupées sur les commandes
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

    if (!user || !hasPermission(user, "orders.manage")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, orderIds, data } = body

    if (!action || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Action et orderIds requis" },
        { status: 400 }
      )
    }

    let updateData: any = {}
    let result

    switch (action) {
      case "assignDeliveryPerson":
        if (!data?.deliveryPersonId) {
          return NextResponse.json(
            { error: "deliveryPersonId requis" },
            { status: 400 }
          )
        }

        // Vérifier que le livreur existe
        const deliveryPerson = await prisma.deliveryPerson.findUnique({
          where: { id: data.deliveryPersonId },
        })

        if (!deliveryPerson) {
          return NextResponse.json(
            { error: "Livreur introuvable" },
            { status: 404 }
          )
        }

        updateData = {
          deliveryPersonId: data.deliveryPersonId,
          // Si la commande est en attente, la passer à confirmée
          status: { in: ["PENDING"] },
        }

        result = await prisma.order.updateMany({
          where: {
            id: { in: orderIds },
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
          },
          data: {
            deliveryPersonId: data.deliveryPersonId,
          },
        })
        break

      case "updateStatus":
        if (!data?.status) {
          return NextResponse.json(
            { error: "status requis" },
            { status: 400 }
          )
        }

        const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED", "CANCELLED"]
        if (!validStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: "Statut invalide" },
            { status: 400 }
          )
        }

        updateData = { status: data.status }

        // Si le statut est DELIVERED, ajouter la date de livraison
        if (data.status === "DELIVERED") {
          updateData.deliveredAt = new Date()
        }

        result = await prisma.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: updateData,
        })
        break

      case "assignZone":
        if (!data?.deliveryZoneId) {
          return NextResponse.json(
            { error: "deliveryZoneId requis" },
            { status: 400 }
          )
        }

        // Vérifier que la zone existe
        const zone = await prisma.deliveryZone.findUnique({
          where: { id: data.deliveryZoneId },
        })

        if (!zone) {
          return NextResponse.json(
            { error: "Zone introuvable" },
            { status: 404 }
          )
        }

        result = await prisma.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            deliveryZoneId: data.deliveryZoneId,
            deliveryFee: data.deliveryFee || zone.deliveryFee,
          },
        })
        break

      case "delete":
        result = await prisma.order.deleteMany({
          where: {
            id: { in: orderIds },
            status: { in: ["PENDING", "CANCELLED"] }, // Seules les commandes en attente ou annulées peuvent être supprimées
          },
        })
        break

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} commande(s) mise(s) à jour`,
    })
  } catch (error: any) {
    console.error("Error performing bulk action:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'action groupée" },
      { status: 500 }
    )
  }
}
