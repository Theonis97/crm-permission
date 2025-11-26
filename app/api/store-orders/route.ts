import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { ExpoPushService } from "@/lib/notifications/expo-push-service"
import { pwaPushNotificationService } from "@/lib/pwa-push-notifications"

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
      requestedDeliveryDate,
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

    const orderItems: Array<{
      productId: string
      variantId: string | null
      name: string
      sku: string | null
      quantity: number
      unitPrice: number
      taxRate: number
      discount: number
      total: number
    }> = []
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

    // Pré-validation du stock AVANT la transaction pour éviter les timeouts
    console.log('🔍 Pré-validation du stock...');
    const stockValidations: {
      storeProductId: string;
      productId: string;
      quantity: number;
      productName: string;
    }[] = []
    
    for (const item of items) {
      const { productId, quantity } = item
      
      const storeProduct = await prisma.storeProduct.findFirst({
        where: {
          storeId,
          productId,
        },
        include: {
          product: {
            select: { name: true }
          }
        }
      })

      if (!storeProduct) {
        return NextResponse.json(
          { error: `Le produit ${productId} n'existe pas dans le stock du magasin` },
          { status: 400 }
        )
      }

      if (storeProduct.stock < quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour ${storeProduct.product.name}. Stock disponible: ${storeProduct.stock}, demandé: ${quantity}` },
          { status: 400 }
        )
      }

      stockValidations.push({
        storeProductId: storeProduct.id,
        productId,
        quantity,
        productName: storeProduct.product.name
      })
    }

    console.log('✅ Stock validé, création de la commande...');

    // Transaction optimisée avec batch operations
    const storeOrder = await prisma.$transaction(async (tx) => {
      // 1. Créer la commande
      const order = await tx.storeOrder.create({
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
          requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
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

      // 2. Création des mouvements de stock SEULEMENT si aucun livreur assigné
      // Si un livreur est assigné, le stock sera débité du livreur lors de la livraison
      if (!deliveryPersonId) {
        console.log('📦 Aucun livreur assigné - Débit du stock magasin');
        
        const stockMovements = stockValidations.map(item => ({
          productId: item.productId,
          quantity: -item.quantity, // Quantité négative pour une sortie
          type: "SALE" as const,
          note: `Vente commande ${orderNumber} - ${customerName}`,
          userId: user.id,
        }))

        await tx.stockMovement.createMany({
          data: stockMovements,
        })

        // 3. Batch mise à jour des stocks du magasin
        const stockUpdates = stockValidations.map(item => 
          tx.storeProduct.update({
            where: { id: item.storeProductId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          })
        )

        await Promise.all(stockUpdates)
      } else {
        console.log('🚚 Livreur assigné - Le stock sera débité du livreur lors de la livraison');
      }

      console.log('✅ Transaction terminée avec succès');
      return order
    }, {
      maxWait: 10000,
      timeout: 20000,
    })

    // Debug : Vérifier les données de la commande
    console.log('🔍 Debug commande créée:', {
      id: storeOrder.id,
      number: storeOrder.number,
      deliveryZoneId: storeOrder.deliveryZoneId,
      hasDeliveryZone: !!storeOrder.deliveryZone,
      deliveryZoneName: storeOrder.deliveryZone?.name,
    })

    // Envoyer notification push FCM si la commande a une zone de livraison
    if (storeOrder.deliveryZoneId && storeOrder.deliveryZone) {
      try {
        console.log(`📱 Envoi notification FCM pour zone ${storeOrder.deliveryZone.name}`)
        
        // Envoyer notification à tous les livreurs de la zone
        await ExpoPushService.notifyDriversInZone(
          storeOrder.deliveryZoneId,
          '🚚 Nouvelle commande !',
          `Commande ${storeOrder.number} - ${storeOrder.total.toLocaleString()} FCFA - ${storeOrder.customerName}`,
          {
            type: 'NEW_ORDER',
            orderId: storeOrder.id,
            orderNumber: storeOrder.number,
            amount: storeOrder.total.toString(),
            zone: storeOrder.deliveryZone.name,
            customerName: storeOrder.customerName,
            action: 'VIEW_ORDER',
          }
        )
        
        console.log(`✅ Notification FCM envoyée pour commande ${storeOrder.number}`)
      } catch (notificationError) {
        // Ne pas faire échouer la création de commande si la notification échoue
        console.error('❌ Erreur envoi notification FCM:', notificationError)
      }
    } else if (storeOrder.deliveryPersonId) {
      // Si pas de zone mais un livreur assigné directement
      try {
        console.log(`📱 Envoi notification FCM au livreur ${storeOrder.deliveryPersonId}`)
        
        await ExpoPushService.notifyDriver(
          storeOrder.deliveryPersonId,
          '📦 Nouvelle commande assignée',
          `Commande ${storeOrder.number} - ${storeOrder.total.toLocaleString()} FCFA`,
          {
            type: 'ORDER_ASSIGNED',
            orderId: storeOrder.id,
            orderNumber: storeOrder.number,
            amount: storeOrder.total.toString(),
            customerName: storeOrder.customerName,
            action: 'VIEW_ORDER',
          }
        )
        
        console.log(`✅ Notification FCM envoyée au livreur`)
      } catch (notificationError) {
        console.error('❌ Erreur envoi notification FCM:', notificationError)
      }
    } else {
      console.log('⚠️ Pas de notification FCM envoyée - Aucune zone ni livreur assigné')
    }

    // 🔔 NOUVEAU : Envoyer notification PWA à tous les abonnés
    try {
      console.log('📱 Envoi notification PWA à tous les abonnés...')
      
      const notificationResult = await pwaPushNotificationService.sendNotificationToAllDrivers({
        title: '🛒 Nouvelle commande POS !',
        body: `${storeOrder.number} - ${storeOrder.total.toLocaleString()} FCFA - ${storeOrder.customerName}`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        data: {
          type: 'NEW_POS_ORDER',
          orderId: storeOrder.id,
          orderNumber: storeOrder.number,
          customerName: storeOrder.customerName,
          total: storeOrder.total.toString(),
          storeId: storeOrder.storeId,
          storeName: storeOrder.store.name,
          url: '/dashboard',
          timestamp: new Date().toISOString()
        },
        actions: [
          {
            action: 'view',
            title: 'Voir la commande',
            icon: '/icons/view-icon.png'
          },
          {
            action: 'dismiss',
            title: 'Ignorer',
            icon: '/icons/dismiss-icon.png'
          }
        ]
      })
      
      console.log(`✅ Notification PWA envoyée à ${notificationResult} abonné(s)`)
    } catch (pwaNotificationError) {
      // Ne pas faire échouer la création de commande si la notification PWA échoue
      console.error('❌ Erreur envoi notification PWA:', pwaNotificationError)
    }

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
      // Si le statut contient une virgule, on le traite comme un tableau
      const statuses = status.includes(",") 
        ? status.split(",").map(s => s.trim()) 
        : [status.trim()]
      where.status = statuses.length > 1 ? { in: statuses } : statuses[0]
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
