import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { sendOrderCancellationEmail, sendOrderDeliveredEmail } from "@/lib/email-service"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: orderId } = await params
    const data = await request.json()

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

    if (!user || !hasPermission(user, "orders.edit")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }
    const { status, priority, notes, deliveryPersonId, deliveryZoneId, cancelReason } = data

    // Vérifier que la commande existe avec ses items
    const existingOrder = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            productId: true,
            quantity: true,
            name: true,
          },
        },
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Commande introuvable" },
        { status: 404 }
      )
    }

    // Vérifier si on passe à CANCELLED depuis un statut non-annulé
    const isBeingCancelled = status === "CANCELLED" && existingOrder.status !== "CANCELLED"
    
    // Vérifier si on passe à DELIVERED depuis un autre statut
    const isBeingDelivered = status === "DELIVERED" && existingOrder.status !== "DELIVERED"
    
    // Vérifier si on réactive une commande annulée (stock doit être redébité)
    const isBeingReactivated = status !== "CANCELLED" && existingOrder.status === "CANCELLED"

    // Exiger un motif d'annulation
    if (isBeingCancelled && (!cancelReason || cancelReason.trim().length === 0)) {
      return NextResponse.json(
        { error: "Le motif d'annulation est obligatoire" },
        { status: 400 }
      )
    }

    // Utiliser une transaction pour garantir la cohérence
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Si la commande est annulée, remettre le stock en magasin
      if (isBeingCancelled) {
        console.log(`🔄 Annulation commande ${existingOrder.number} - Remise du stock en magasin`)
        
        for (const item of existingOrder.items) {
          // Vérifier si le produit existe dans le stock du magasin
          const storeProduct = await tx.storeProduct.findFirst({
            where: {
              storeId: existingOrder.storeId,
              productId: item.productId,
            },
          })

          if (storeProduct) {
            // Incrémenter le stock existant
            await tx.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                stock: {
                  increment: item.quantity,
                },
              },
            })
          } else {
            // Créer l'entrée de stock si elle n'existe pas
            await tx.storeProduct.create({
              data: {
                storeId: existingOrder.storeId,
                productId: item.productId,
                stock: item.quantity,
                minStock: 0,
                maxStock: 0,
              },
            })
          }

          // Créer le mouvement de stock (RETURN)
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity, // Positif pour un retour
              type: "RETURN",
              note: `Annulation commande ${existingOrder.number} - ${cancelReason || 'Changement de statut'}`,
              userId: user.id,
            },
          })
        }
        
        console.log(`✅ Stock remis en magasin pour ${existingOrder.items.length} produit(s)`)
      }

      // Si on réactive une commande annulée, redébiter le stock
      if (isBeingReactivated) {
        console.log(`🔄 Réactivation commande ${existingOrder.number} - Débit du stock`)
        
        for (const item of existingOrder.items) {
          const storeProduct = await tx.storeProduct.findFirst({
            where: {
              storeId: existingOrder.storeId,
              productId: item.productId,
            },
          })

          if (storeProduct) {
            // Vérifier qu'il y a assez de stock
            if (storeProduct.stock < item.quantity) {
              throw new Error(`Stock insuffisant pour ${item.name}. Disponible: ${storeProduct.stock}, requis: ${item.quantity}`)
            }
            
            // Décrémenter le stock
            await tx.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                stock: {
                  decrement: item.quantity,
                },
              },
            })
          } else {
            throw new Error(`Produit ${item.name} non trouvé dans le stock du magasin`)
          }

          // Créer le mouvement de stock (SALE)
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: -item.quantity, // Négatif pour une sortie
              type: "SALE",
              note: `Réactivation commande ${existingOrder.number}`,
              userId: user.id,
            },
          })
        }
        
        console.log(`✅ Stock débité pour ${existingOrder.items.length} produit(s)`)
      }

      // Préparer les données de mise à jour
      const updateData: any = {
        updatedAt: new Date(),
      }

      if (status !== undefined) {
        updateData.status = status
        
        // Si le statut passe à DELIVERED, enregistrer la date de livraison
        if (status === "DELIVERED") {
          updateData.deliveredAt = new Date()
          updateData.paymentStatus = "PAID"
        }
        
        // Si le statut passe à CANCELLED, enregistrer la raison si fournie
        if (status === "CANCELLED") {
          updateData.cancelReason = cancelReason || "Changement de statut manuel"
        }
      }

      if (priority !== undefined) {
        updateData.priority = priority
      }

      if (notes !== undefined) {
        updateData.notes = notes
      }

      if (deliveryPersonId !== undefined) {
        updateData.deliveryPersonId = deliveryPersonId || null
      }

      if (deliveryZoneId !== undefined) {
        updateData.deliveryZoneId = deliveryZoneId || null
      }

      // Mettre à jour la commande
      return await tx.storeOrder.update({
        where: { id: orderId },
        data: updateData,
        include: {
          store: {
            select: {
              id: true,
              name: true,
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
      })
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    console.log(`✅ Commande ${updatedOrder.number} mise à jour - Nouveau statut: ${updatedOrder.status}`)

    // Récupérer les infos du magasin pour les emails
    const store = await prisma.store.findUnique({
      where: { id: existingOrder.storeId },
      select: { id: true, name: true }
    })

    // Récupérer les items avec les infos complètes pour l'email
    const orderWithItems = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            name: true,
            quantity: true,
            unitPrice: true,
            total: true,
          }
        }
      }
    })

    const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email

    // Envoyer email d'annulation
    if (isBeingCancelled && store && orderWithItems) {
      sendOrderCancellationEmail(
        {
          id: updatedOrder.id,
          number: updatedOrder.number,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone || '',
          total: updatedOrder.total,
          items: orderWithItems.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        },
        store,
        { id: user.id, name: userName, email: user.email },
        cancelReason
      ).catch(err => console.error('❌ Erreur envoi email annulation:', err))
    }

    // Envoyer email de livraison
    if (isBeingDelivered && store && orderWithItems) {
      sendOrderDeliveredEmail(
        {
          id: updatedOrder.id,
          number: updatedOrder.number,
          customerName: updatedOrder.customerName,
          customerPhone: updatedOrder.customerPhone || '',
          total: updatedOrder.total,
          items: orderWithItems.items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          }))
        },
        store,
        { id: user.id, name: userName, email: user.email }
      ).catch(err => console.error('❌ Erreur envoi email livraison:', err))
    }

    return NextResponse.json(updatedOrder)
  } catch (error: any) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour de la commande" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: orderId } = await params

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

    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
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
