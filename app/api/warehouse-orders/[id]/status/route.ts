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

    // 🔥 IMPORTANT: Créer/Mettre à jour les StoreProduct quand la commande est approuvée ou livrée
    if (status === "APPROVED" || status === "DELIVERED") {
      console.log("🚀 Début création StoreProduct pour la commande:", order.id)
      console.log("📦 Magasin ID:", order.storeId)
      console.log("📋 Nombre d'items:", order.items.length)
      
      for (const item of order.items) {
        const requestedQty = item.requestedQuantity || 0
        console.log(`  ➡️ Traitement produit: ${item.name} (${item.productId}) - Quantité: ${requestedQty}`)
        
        // Vérifier si le produit existe déjà dans le magasin
        const existingStoreProduct = await prisma.storeProduct.findFirst({
          where: {
            storeId: order.storeId,
            productId: item.productId,
          },
        })

        if (existingStoreProduct) {
          console.log(`    ✅ StoreProduct existe déjà (ID: ${existingStoreProduct.id}), mise à jour du stock`)
          // Mettre à jour le stock existant (ajouter la quantité)
          await prisma.storeProduct.update({
            where: { id: existingStoreProduct.id },
            data: {
              stock: existingStoreProduct.stock + requestedQty,
            },
          })
          console.log(`    📈 Stock mis à jour: ${existingStoreProduct.stock} → ${existingStoreProduct.stock + requestedQty}`)
        } else {
          console.log(`    🆕 Création nouveau StoreProduct`)
          // Créer un nouveau StoreProduct pour ce magasin
          const newStoreProduct = await prisma.storeProduct.create({
            data: {
              storeId: order.storeId,
              productId: item.productId,
              stock: requestedQty,
              minStock: 10, // Valeur par défaut
            },
          })
          console.log(`    ✨ StoreProduct créé avec succès (ID: ${newStoreProduct.id})`)
        }
      }
      
      console.log("✅ Tous les StoreProduct ont été créés/mis à jour avec succès")
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
