import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/orders/[id]
 * Modifie une commande existante
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    console.log(`📝 Modification de la commande ${orderId}...`)
    
    const data = await request.json()
    const {
      customerName,
      customerPhone,
      deliveryAddress,
      requestedDeliveryDate,
      status,
      deliveryPersonId,
      items,
      total
    } = data

    // Vérifier que la commande existe
    const existingOrder = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: { items: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Commencer une transaction pour modifier la commande et ses items
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Supprimer les anciens items
      await tx.storeOrderItem.deleteMany({
        where: { storeOrderId: orderId }
      })

      // 2. Mettre à jour la commande
      const order = await tx.storeOrder.update({
        where: { id: orderId },
        data: {
          customerName,
          customerPhone,
          deliveryAddress,
          requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
          status,
          deliveryPersonId: deliveryPersonId || undefined,
          total,
          updatedAt: new Date()
        }
      })

      // 3. Créer les nouveaux items
      for (const item of items) {
        // Chercher ou créer un produit générique pour les commandes WhatsApp
        let productId = null
        
        // Essayer de trouver un produit existant par nom
        const existingProduct = await tx.product.findFirst({
          where: {
            OR: [
              { name: { contains: item.productName, mode: 'insensitive' } },
              { sku: { contains: item.productName, mode: 'insensitive' } }
            ]
          }
        })
        
        if (existingProduct) {
          productId = existingProduct.id
        } else {
          // Trouver ou créer une catégorie générique pour les produits WhatsApp
          let whatsappCategory = await tx.productCategory.findFirst({
            where: { name: 'Produits WhatsApp' }
          })
          
          if (!whatsappCategory) {
            whatsappCategory = await tx.productCategory.create({
              data: {
                name: 'Produits WhatsApp',
                description: 'Catégorie pour les produits créés automatiquement depuis WhatsApp'
              }
            })
          }
          
          // Créer un produit générique si non trouvé
          const genericProduct = await tx.product.create({
            data: {
              name: item.productName,
              sku: `WA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              description: `Produit créé automatiquement depuis WhatsApp`,
              prixVente: item.unitPrice,
              prixAchat: 0,
              stock: 0,
              minStock: 0,
              categoryId: whatsappCategory.id
            }
          })
          productId = genericProduct.id
        }

        await tx.storeOrderItem.create({
          data: {
            storeOrderId: orderId,
            productId: productId,
            name: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            taxRate: 0,
            discount: 0
          }
        })
      }

      return order
    })

    console.log(`✅ Commande ${orderId} modifiée avec succès`)

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Commande modifiée avec succès'
    })

  } catch (error) {
    console.error('❌ Erreur lors de la modification de la commande:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la modification de la commande' 
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/orders/[id]
 * Récupère une commande par son ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id
    console.log(`📋 Récupération de la commande ${orderId}...`)
    
    const order = await prisma.storeOrder.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true
              }
            }
          }
        },
        deliveryZone: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        store: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Formater les données
    const formattedOrder = {
      id: order.id,
      number: order.number,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      deliveryAddress: order.deliveryAddress,
      requestedDeliveryDate: order.requestedDeliveryDate,
      total: order.total,
      notes: order.notes,
      createdAt: order.createdAt,
      items: order.items.map(item => ({
        id: item.id,
        productName: item.product?.name || item.name || 'Produit inconnu',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      deliveryZone: order.deliveryZone,
      deliveryPerson: order.deliveryPerson,
      store: order.store
    }

    console.log(`✅ Commande ${orderId} récupérée`)

    return NextResponse.json({
      success: true,
      data: formattedOrder
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération de la commande:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération de la commande' 
      },
      { status: 500 }
    )
  }
}
