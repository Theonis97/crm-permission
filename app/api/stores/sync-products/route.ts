import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

/**
 * Route API pour synchroniser les produits dans les magasins
 * à partir des commandes confirmées/livrées
 * 
 * Cette route crée les StoreProduct manquants pour toutes les commandes
 * qui ont le statut CONFIRMED ou DELIVERED
 */
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

    if (!user || !hasPermission(user, "warehouse.orders.update")) {
      return NextResponse.json(
        { error: "Permission refusée - Admin uniquement" },
        { status: 403 }
      )
    }

    // Récupérer toutes les commandes confirmées ou livrées
    const orders = await prisma.order.findMany({
      where: {
        status: {
          in: ["CONFIRMED", "DELIVERED"],
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        store: true,
      },
    })

    let storeProductsCreated = 0
    let storeProductsUpdated = 0
    const errors: string[] = []

    // Pour chaque commande
    for (const order of orders) {
      try {
        // Pour chaque produit de la commande
        for (const item of order.items) {
          // Vérifier si le StoreProduct existe déjà
          const existingStoreProduct = await prisma.storeProduct.findFirst({
            where: {
              storeId: order.storeId,
              productId: item.productId,
            },
          })

          if (existingStoreProduct) {
            // Mettre à jour le stock (ajouter la quantité)
            await prisma.storeProduct.update({
              where: { id: existingStoreProduct.id },
              data: {
                stock: existingStoreProduct.stock + item.quantity,
              },
            })
            storeProductsUpdated++
          } else {
            // Créer un nouveau StoreProduct
            await prisma.storeProduct.create({
              data: {
                storeId: order.storeId,
                productId: item.productId,
                stock: item.quantity,
                minStock: 10, // Valeur par défaut
              },
            })
            storeProductsCreated++
          }
        }
      } catch (error: any) {
        errors.push(`Erreur commande ${order.number}: ${error.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Synchronisation terminée",
      stats: {
        ordersProcessed: orders.length,
        storeProductsCreated,
        storeProductsUpdated,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error syncing store products:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la synchronisation" },
      { status: 500 }
    )
  }
}
