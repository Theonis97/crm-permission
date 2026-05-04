import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import type { RestockingOrderStatus } from "@prisma/client"

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
    const data = (await request.json()) as {
      status?: RestockingOrderStatus
      notes?: string | null
      items?: { id: string; requestedQuantity: number }[]
    }
    const { status, notes, items } = data

    const hasStatus = status !== undefined && status !== null && String(status).length > 0
    const hasNotes = notes !== undefined
    const hasItems = Array.isArray(items) && items.length > 0

    if (!hasStatus && !hasNotes && !hasItems) {
      return NextResponse.json(
        { error: "Fournissez au moins un champ à mettre à jour (statut, notes ou lignes)." },
        { status: 400 }
      )
    }

    const existing = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Commande introuvable" }, { status: 404 })
    }

    if ((hasItems || hasNotes) && existing.status !== "PENDING") {
      return NextResponse.json(
        {
          error:
            "Seules les commandes en attente peuvent être modifiées (quantités ou notes). Changez le statut séparément si besoin.",
        },
        { status: 400 }
      )
    }

    const orderInclude = {
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
    } as const

    if (hasItems) {
      const allowed = new Set(existing.items.map((i) => i.id))
      for (const row of items!) {
        if (!row?.id || !allowed.has(row.id)) {
          return NextResponse.json(
            { error: "Une ou plusieurs lignes de commande sont invalides." },
            { status: 400 }
          )
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const row of items!) {
          const qty = Math.max(1, Math.floor(Number(row.requestedQuantity) || 0))
          const line = existing.items.find((i) => i.id === row.id)!
          const total = Number(line.unitCost) * qty
          await tx.orderItem.update({
            where: { id: row.id },
            data: { requestedQuantity: qty, total },
          })
        }

        const lines = await tx.orderItem.findMany({ where: { orderId: id } })
        const totalQuantity = lines.reduce((s, i) => s + i.requestedQuantity, 0)
        const totalCost = lines.reduce((s, i) => s + i.total, 0)

        await tx.order.update({
          where: { id },
          data: {
            totalQuantity,
            totalCost,
            ...(hasNotes
              ? { notes: notes === null || notes === "" ? null : String(notes) }
              : {}),
            ...(hasStatus ? { status: status as RestockingOrderStatus } : {}),
          },
        })
      })
    } else {
      await prisma.order.update({
        where: { id },
        data: {
          ...(hasNotes
            ? { notes: notes === null || notes === "" ? null : String(notes) }
            : {}),
          ...(hasStatus ? { status: status as RestockingOrderStatus } : {}),
        },
      })
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: orderInclude,
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
