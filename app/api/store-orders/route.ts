import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

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

    if (!user || !hasPermission(user, "orders.create")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const data = await request.json()
    const {
      storeId,
      contactId,
      customerName,
      customerPhone,
      customerEmail,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      priority,
      items, // [{ productId, variantId?, quantity, unitPrice }]
      notes,
      deliveryPersonId,
      deliveryZoneId,
      deliveryFee,
      paymentMethod,
    } = data

    if (!storeId || !customerName || !customerPhone || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin introuvable" },
        { status: 404 }
      )
    }

    // Générer un numéro de commande unique
    const orderCount = await prisma.storeOrder.count()
    const orderNumber = `CMD-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, "0")}`

    // Calculer les totaux
    let subtotal = 0
    let totalTax = 0

    const orderItems = []
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      })

      if (!product) {
        return NextResponse.json(
          { error: `Produit ${item.productId} introuvable` },
          { status: 404 }
        )
      }

      const itemTotal = item.quantity * item.unitPrice
      const itemTax = (itemTotal * product.tva) / 100

      subtotal += itemTotal
      totalTax += itemTax

      orderItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        name: product.name,
        sku: product.sku || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: product.tva,
        discount: 0,
        total: itemTotal + itemTax,
      })
    }

    const deliveryFeeAmount = deliveryFee || 0
    const total = subtotal + totalTax + deliveryFeeAmount

    // Créer la commande client
    const storeOrder = await prisma.storeOrder.create({
      data: {
        number: orderNumber,
        storeId,
        contactId: contactId || null,
        customerName,
        customerPhone,
        customerEmail: customerEmail || null,
        deliveryAddress: deliveryAddress || null,
        deliveryLatitude: deliveryLatitude || null,
        deliveryLongitude: deliveryLongitude || null,
        status: "PENDING",
        priority: priority || "NORMAL",
        subtotal,
        totalTax,
        deliveryFee: deliveryFeeAmount,
        total,
        paymentMethod: paymentMethod || "CASH",
        paymentStatus: "PENDING",
        deliveryPersonId: deliveryPersonId || null,
        deliveryZoneId: deliveryZoneId || null,
        notes: notes || null,
        createdById: user.id,
        items: {
          create: orderItems,
        },
      },
      include: {
        store: true,
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                category: true,
                brand: true,
              },
            },
            variant: true,
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        deliveryZone: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(storeOrder, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
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

    if (!user || !hasPermission(user, "orders.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const storeId = searchParams.get("storeId")
    const status = searchParams.get("status")

    const where: any = {}

    if (storeId) {
      where.storeId = storeId
    }

    if (status) {
      where.status = status
    }

    const storeOrders = await prisma.storeOrder.findMany({
      where,
      include: {
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
              },
            },
          },
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
        deliveryZone: {
          select: {
            id: true,
            name: true,
            color: true,
            deliveryFee: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    })

    return NextResponse.json(storeOrders)
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des commandes" },
      { status: 500 }
    )
  }
}
