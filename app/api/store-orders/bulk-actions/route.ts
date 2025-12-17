import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { sendOrderCancellationEmail, sendOrderDeliveredEmail } from "@/lib/email-service"

// POST - Actions groupées sur les commandes
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

    if (!user || !hasPermission(user, "orders.manage")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, orderIds, data } = body

    if (!action || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Action et orderIds requis" },
        { status: 400 }
      )
    }

    let updateData: any = {}
    let result

    switch (action) {
      case "assignDeliveryPerson":
        if (!data?.deliveryPersonId) {
          return NextResponse.json(
            { error: "deliveryPersonId requis" },
            { status: 400 }
          )
        }

        // Vérifier que le livreur existe
        const deliveryPerson = await prisma.deliveryPerson.findUnique({
          where: { id: data.deliveryPersonId },
        })

        if (!deliveryPerson) {
          return NextResponse.json(
            { error: "Livreur introuvable" },
            { status: 404 }
          )
        }

        updateData = {
          deliveryPersonId: data.deliveryPersonId,
          // Si la commande est en attente, la passer à confirmée
          status: { in: ["PENDING"] },
        }

        result = await prisma.storeOrder.updateMany({
          where: {
            id: { in: orderIds },
            status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY"] },
          },
          data: {
            deliveryPersonId: data.deliveryPersonId,
          },
        })
        break

      case "updateStatus":
        if (!data?.status) {
          return NextResponse.json(
            { error: "status requis" },
            { status: 400 }
          )
        }

        const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED", "CANCELLED"]
        if (!validStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: "Statut invalide" },
            { status: 400 }
          )
        }

        // Si on annule des commandes, il faut gérer le retour de stock
        if (data.status === "CANCELLED") {
          // Exiger un motif d'annulation
          if (!data.cancelReason || data.cancelReason.trim().length === 0) {
            return NextResponse.json(
              { error: "Le motif d'annulation est obligatoire" },
              { status: 400 }
            )
          }

          // Récupérer les commandes avec leurs items pour le retour de stock
          const ordersToCancel = await prisma.storeOrder.findMany({
            where: {
              id: { in: orderIds },
              status: { not: "CANCELLED" }, // Seulement celles qui ne sont pas déjà annulées
            },
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

          // Transaction pour annuler et remettre le stock
          result = await prisma.$transaction(async (tx) => {
            let updatedCount = 0

            for (const order of ordersToCancel) {
              // Mettre à jour le statut de la commande
              await tx.storeOrder.update({
                where: { id: order.id },
                data: {
                  status: "CANCELLED",
                  cancelReason: data.cancelReason || "Annulation groupée",
                  updatedAt: new Date(),
                },
              })

              // Remettre le stock pour chaque item
              for (const item of order.items) {
                const storeProduct = await tx.storeProduct.findFirst({
                  where: {
                    storeId: order.storeId,
                    productId: item.productId,
                  },
                })

                if (storeProduct) {
                  await tx.storeProduct.update({
                    where: { id: storeProduct.id },
                    data: {
                      stock: { increment: item.quantity },
                    },
                  })
                } else {
                  await tx.storeProduct.create({
                    data: {
                      storeId: order.storeId,
                      productId: item.productId,
                      stock: item.quantity,
                      minStock: 0,
                      maxStock: 0,
                    },
                  })
                }

                // Créer le mouvement de stock
                await tx.stockMovement.create({
                  data: {
                    productId: item.productId,
                    quantity: item.quantity,
                    type: "RETURN",
                    note: `Annulation groupée commande ${order.number}`,
                    userId: user.id,
                  },
                })
              }

              updatedCount++
              console.log(`✅ Commande ${order.number} annulée - Stock remis pour ${order.items.length} produit(s)`)
            }

            return { count: updatedCount }
          }, {
            maxWait: 15000,
            timeout: 30000,
          })

          // Envoyer les emails d'annulation pour chaque commande
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
          for (const order of ordersToCancel) {
            const store = await prisma.store.findUnique({
              where: { id: order.storeId },
              select: { id: true, name: true }
            })
            const orderWithItems = await prisma.storeOrder.findUnique({
              where: { id: order.id },
              include: { items: { select: { name: true, quantity: true, unitPrice: true, total: true } } }
            })
            if (store && orderWithItems) {
              sendOrderCancellationEmail(
                {
                  id: order.id,
                  number: order.number,
                  customerName: order.customerName,
                  customerPhone: order.customerPhone || '',
                  total: order.total,
                  items: orderWithItems.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.total
                  }))
                },
                store,
                { id: user.id, name: userName, email: user.email },
                data.cancelReason
              ).catch(err => console.error('❌ Erreur envoi email annulation:', err))
            }
          }
        } else {
          // Vérifier si on réactive des commandes annulées (stock doit être redébité)
          const ordersToReactivate = await prisma.storeOrder.findMany({
            where: {
              id: { in: orderIds },
              status: "CANCELLED", // Commandes actuellement annulées
            },
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

          if (ordersToReactivate.length > 0) {
            // Transaction pour réactiver et redébiter le stock
            result = await prisma.$transaction(async (tx) => {
              let updatedCount = 0

              // D'abord, traiter les commandes annulées qui doivent être réactivées
              for (const order of ordersToReactivate) {
                // Vérifier et débiter le stock pour chaque item
                for (const item of order.items) {
                  const storeProduct = await tx.storeProduct.findFirst({
                    where: {
                      storeId: order.storeId,
                      productId: item.productId,
                    },
                  })

                  if (storeProduct) {
                    if (storeProduct.stock < item.quantity) {
                      throw new Error(`Stock insuffisant pour ${item.name}. Disponible: ${storeProduct.stock}, requis: ${item.quantity}`)
                    }
                    
                    await tx.storeProduct.update({
                      where: { id: storeProduct.id },
                      data: {
                        stock: { decrement: item.quantity },
                      },
                    })
                  } else {
                    throw new Error(`Produit ${item.name} non trouvé dans le stock du magasin`)
                  }

                  // Créer le mouvement de stock (SALE)
                  await tx.stockMovement.create({
                    data: {
                      productId: item.productId,
                      quantity: -item.quantity,
                      type: "SALE",
                      note: `Réactivation commande ${order.number}`,
                      userId: user.id,
                    },
                  })
                }

                // Mettre à jour le statut
                const orderUpdateData: any = {
                  status: data.status,
                  updatedAt: new Date(),
                }
                
                if (data.status === "DELIVERED") {
                  orderUpdateData.deliveredAt = new Date()
                  orderUpdateData.paymentStatus = "PAID"
                }

                await tx.storeOrder.update({
                  where: { id: order.id },
                  data: orderUpdateData,
                })

                updatedCount++
                console.log(`✅ Commande ${order.number} réactivée - Stock débité pour ${order.items.length} produit(s)`)
              }

              // Ensuite, mettre à jour les commandes non-annulées (simple update)
              const nonCancelledOrderIds = orderIds.filter(
                (id: string) => !ordersToReactivate.find(o => o.id === id)
              )

              if (nonCancelledOrderIds.length > 0) {
                const simpleUpdateData: any = { status: data.status, updatedAt: new Date() }
                
                if (data.status === "DELIVERED") {
                  simpleUpdateData.deliveredAt = new Date()
                  simpleUpdateData.paymentStatus = "PAID"
                }

                const simpleResult = await tx.storeOrder.updateMany({
                  where: { id: { in: nonCancelledOrderIds } },
                  data: simpleUpdateData,
                })
                updatedCount += simpleResult.count
              }

              return { count: updatedCount }
            }, {
              maxWait: 15000,
              timeout: 30000,
            })
          } else {
            // Aucune commande annulée, mise à jour simple
            updateData = { status: data.status, updatedAt: new Date() }

            if (data.status === "DELIVERED") {
              updateData.deliveredAt = new Date()
              updateData.paymentStatus = "PAID"
            }

            result = await prisma.storeOrder.updateMany({
              where: {
                id: { in: orderIds },
              },
              data: updateData,
            })
          }

          // Envoyer les emails de livraison si le statut est DELIVERED
          if (data.status === "DELIVERED") {
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
            const deliveredOrders = await prisma.storeOrder.findMany({
              where: { id: { in: orderIds }, status: "DELIVERED" },
              include: { items: { select: { name: true, quantity: true, unitPrice: true, total: true } } }
            })
            for (const order of deliveredOrders) {
              const store = await prisma.store.findUnique({
                where: { id: order.storeId },
                select: { id: true, name: true }
              })
              if (store) {
                sendOrderDeliveredEmail(
                  {
                    id: order.id,
                    number: order.number,
                    customerName: order.customerName,
                    customerPhone: order.customerPhone || '',
                    total: order.total,
                    items: order.items.map(item => ({
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
            }
          }
        }
        break

      case "assignZone":
        if (!data?.deliveryZoneId) {
          return NextResponse.json(
            { error: "deliveryZoneId requis" },
            { status: 400 }
          )
        }

        // Vérifier que la zone existe
        const zone = await prisma.deliveryZone.findUnique({
          where: { id: data.deliveryZoneId },
        })

        if (!zone) {
          return NextResponse.json(
            { error: "Zone introuvable" },
            { status: 404 }
          )
        }

        result = await prisma.storeOrder.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            deliveryZoneId: data.deliveryZoneId,
            deliveryFee: data.deliveryFee || zone.deliveryFee,
          },
        })
        break

      case "delete":
        result = await prisma.storeOrder.deleteMany({
          where: {
            id: { in: orderIds },
            status: { in: ["PENDING", "CANCELLED"] }, // Seules les commandes en attente ou annulées peuvent être supprimées
          },
        })
        break

      default:
        return NextResponse.json(
          { error: "Action non reconnue" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} commande(s) mise(s) à jour`,
    })
  } catch (error: any) {
    console.error("Error performing bulk action:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'action groupée" },
      { status: 500 }
    )
  }
}
