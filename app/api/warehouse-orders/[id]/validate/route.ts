import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
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
            variant: true,
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
    if (order.status === "CONFIRMED" || order.status === "PREPARING" || order.status === "READY") {
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
      if (item.product.stock < item.quantity) {
        insufficientStock.push({
          productName: item.product.name,
          requested: item.quantity,
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

    // Utiliser une transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Mettre à jour le statut de la commande
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paidAt: new Date(),
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
              variant: true,
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

      // 2. Créer les mouvements de sortie de stock pour chaque produit
      const movements = []
      for (const item of order.items) {
        // Créer le mouvement de sortie (quantité négative pour sortie)
        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity, // Négatif pour sortie
            type: "EXIT", // Sortie vers magasin (transfert)
            note: `Commande ${order.number} - Transfert vers ${order.store.name}`,
            userId: user.id,
          },
        })

        movements.push(movement)

        // Mettre à jour le stock du produit
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      }

      return { order: updatedOrder, movements }
    })

    return NextResponse.json({
      success: true,
      order: result.order,
      movements: result.movements,
      message: `Commande validée avec succès. ${result.movements.length} mouvement(s) de stock créé(s).`,
    })
  } catch (error) {
    console.error("Error validating order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la validation de la commande" },
      { status: 500 }
    )
  }
}
