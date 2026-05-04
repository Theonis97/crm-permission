import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { hasPermission } from "@/lib/auth-helpers"

export async function POST(
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

    if (!user || !hasPermission(user, "warehouse.orders.validate")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Récupérer la commande avec ses items
    const order = await prisma.order.findUnique({
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
        { error: "Commande introuvable" },
        { status: 404 }
      )
    }

    // Vérifier que la commande n'est pas déjà validée
    if (order.status === "APPROVED" || order.status === "PREPARING" || order.status === "SHIPPED" || order.status === "DELIVERED") {
      return NextResponse.json(
        { error: "Cette commande est déjà validée" },
        { status: 400 }
      )
    }

    // Vérifier le stock disponible pour chaque produit
    const insufficientStock: Array<{
      productName: string
      requested: number
      available: number
    }> = []

    for (const item of order.items) {
      const requestedQty = item.requestedQuantity || 0
      if (item.product.stock < requestedQty) {
        insufficientStock.push({
          productName: item.product.name,
          requested: requestedQty,
          available: item.product.stock,
        })
      }
    }

    if (insufficientStock.length > 0) {
      return NextResponse.json(
        {
          error: "Stock insuffisant pour certains produits",
          insufficientStock,
        },
        { status: 400 }
      )
    }

    /**
     * La validation entrepôt n’altère pas `Product.stock`.
     * Le débit entrepôt + crédit magasin est réservé au passage « Livré » par le magasin
     * (`PATCH /api/restocking-orders/[id]/status` avec status=DELIVERED).
     */
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedBy: user.id,
          approvedAt: new Date(),
        },
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

      return { order: updatedOrder }
    })

    return NextResponse.json({
      success: true,
      order: result.order,
      movements: [],
      message:
        "Commande approuvée. Le stock entrepôt sera débité et celui du magasin crédité lorsque le magasin marquera la commande comme livrée.",
    })
  } catch (error) {
    console.error("Error validating order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la validation de la commande" },
      { status: 500 }
    )
  }
}
