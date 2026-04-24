import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { notifyWarehouseStaff } from "@/lib/stock-flow-notifications"

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

    if (!user || !hasPermission(user, "products.create")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { storeId, items, notes, priority } = body

    if (!storeId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Données invalides" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Générer un numéro de commande unique basé sur timestamp
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const day = now.getDate().toString().padStart(2, "0")
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    const seconds = now.getSeconds().toString().padStart(2, "0")
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0")
    
    const number = `RST-${year}${month}${day}-${hours}${minutes}${seconds}${milliseconds}`

    // Calculer les totaux
    const totalQuantity = items.reduce((sum: number, item: any) => sum + item.requestedQuantity, 0)
    const totalCost = items.reduce((sum: number, item: any) => sum + item.total, 0)

    // Créer la commande d'approvisionnement
    const restockingOrder = await prisma.order.create({
      data: {
        number,
        storeId,
        status: "PENDING",
        priority: priority || "NORMAL",
        totalQuantity,
        totalCost,
        notes: notes || null,
        requestedBy: user.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            sku: item.sku || null,
            requestedQuantity: item.requestedQuantity,
            unitCost: item.unitCost,
            total: item.total,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    void notifyWarehouseStaff({
      title: "Demande d'approvisionnement (magasin)",
      body: `${store.name} · ${number} · ${totalQuantity} unité(s)`,
      data: {
        type: "STORE_RESTOCKING_ORDER",
        id: restockingOrder.id,
        storeId,
        number,
      },
    }).catch((err) => console.error("[notify STORE_RESTOCKING_ORDER]", err))

    return NextResponse.json(restockingOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating restocking order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
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

    if (!user || !hasPermission(user, "warehouses.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")
    const status = searchParams.get("status")

    const where: any = {}
    if (storeId) {
      where.storeId = storeId
    }
    if (status) {
      where.status = status
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error("Error fetching restocking orders:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    )
  }
}
