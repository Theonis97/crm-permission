import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Liste des retours de produits d'un magasin
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params

    const returns = await prisma.productReturn.findMany({
      where: { storeId },
      include: {
        storeOrder: {
          select: {
            id: true,
            number: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(returns)
  } catch (error) {
    console.error("Erreur lors de la récupération des retours:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau retour de produit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()

    const { storeOrderId, items, notes } = body

    // Vérifier que la commande existe et appartient au magasin
    const storeOrder = await prisma.storeOrder.findFirst({
      where: {
        id: storeOrderId,
        storeId,
      },
      include: {
        items: true,
      }
    })

    if (!storeOrder) {
      return NextResponse.json(
        { error: "Commande non trouvée" },
        { status: 404 }
      )
    }

    // Générer le numéro de retour
    const today = new Date()
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
    const count = await prisma.productReturn.count({
      where: {
        storeId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
          lt: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1),
        }
      }
    })
    const returnNumber = `RET-${dateStr}-${String(count + 1).padStart(3, '0')}`

    // Calculer le montant total du remboursement
    let totalRefundAmount = 0
    const itemsData = items.map((item: any) => {
      const orderItem = storeOrder.items.find(oi => oi.id === item.storeOrderItemId)
      if (!orderItem) {
        throw new Error(`Item de commande non trouvé: ${item.storeOrderItemId}`)
      }
      
      const refundAmount = item.quantity * orderItem.unitPrice
      totalRefundAmount += refundAmount

      return {
        productId: orderItem.productId,
        storeOrderItemId: item.storeOrderItemId,
        productName: orderItem.name,
        productSku: orderItem.sku,
        quantity: item.quantity,
        unitPrice: orderItem.unitPrice,
        refundAmount,
        reason: item.reason,
        reasonDetails: item.reasonDetails || null,
        isRefunded: item.isRefunded ?? true, // Par défaut, on rembourse
      }
    })

    // Créer le retour avec ses items
    const productReturn = await prisma.productReturn.create({
      data: {
        number: returnNumber,
        storeId,
        storeOrderId,
        customerName: storeOrder.customerName,
        customerPhone: storeOrder.customerPhone,
        totalRefundAmount,
        notes,
        createdById: session.user.id,
        items: {
          create: itemsData
        }
      },
      include: {
        storeOrder: {
          select: {
            id: true,
            number: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(productReturn, { status: 201 })
  } catch (error: any) {
    console.error("Erreur lors de la création du retour:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
