import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json({ error: "Order ID required" }, { status: 400 })
    }

    const order = await prisma.subBoxOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        updatedAt: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: order
    })

  } catch (error) {
    console.error("Error fetching order status:", error)
    return NextResponse.json(
      { error: "Error fetching order status" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    const body = await request.json()
    const { items, customerName } = body

    if (!orderId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 1. Check if order exists and is PENDING
    const existingOrder = await prisma.subBoxOrder.findUnique({
      where: { id: orderId }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 })
    }

    if (existingOrder.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Cannot update an order that is not PENDING" }, 
        { status: 400 }
      )
    }

    // 2. Calculate new totals
    let subtotal = 0
    let totalItems = 0
    const orderItemsData: {
      productId: string
      name: string
      sku: string | null
      unitPrice: number
      quantity: number
      total: number
    }[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      })

      if (!product) continue

      const price = product.prixVente || 0
      const quantity = item.quantity
      const total = price * quantity

      subtotal += total
      totalItems += quantity

      orderItemsData.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: price,
        quantity: quantity,
        total: total,
      })
    }

    // 3. Update order in transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
        // Delete old items
        await tx.subBoxOrderItem.deleteMany({
            where: { subBoxOrderId: orderId }
        })

        // Update order details and create new items
        const order = await tx.subBoxOrder.update({
            where: { id: orderId },
            data: {
                subtotal: subtotal,
                totalItems: totalItems,
                clientCode: customerName || existingOrder.clientCode,
                notes: `Commande client web - ${customerName} (Modifié)`,
                items: {
                    create: orderItemsData
                }
            }
        })
        return order
    })

    return NextResponse.json({
        success: true,
        data: {
            orderId: updatedOrder.id,
            total: subtotal,
            date: updatedOrder.updatedAt
        }
    })

  } catch (error) {
    console.error("Error updating client order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    )
  }
}
