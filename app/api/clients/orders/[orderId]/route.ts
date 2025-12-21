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
