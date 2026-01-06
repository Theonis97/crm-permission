import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProductReturnReason, ProductCondition } from "@prisma/client"

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
                photos: true,
                prixVente: true,
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
              }
            },
            exchangeProduct: {
              select: {
                id: true,
                name: true,
                photos: true,
                prixVente: true,
              }
            },
            exchangeVariant: {
              select: {
                id: true,
                name: true,
                sku: true,
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

// Interface pour les items du retour
interface ReturnItemInput {
  productId: string
  variantId?: string | null
  quantity: number
  unitPrice: number
  reason: ProductReturnReason
  reasonDetails?: string | null
  condition: ProductCondition
  // Produit d'échange (optionnel)
  exchangeProductId?: string | null
  exchangeDiscount?: number | null
}

// POST - Créer un nouveau retour de produit (sans commande obligatoire)
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

    const { 
      items, 
      notes, 
      customerName, 
      customerPhone,
      storeOrderId // Optionnel maintenant
    } = body

    // Validation des items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Au moins un produit doit être retourné" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Si une commande est liée, la vérifier
    let storeOrder = null
    if (storeOrderId) {
      storeOrder = await prisma.storeOrder.findFirst({
        where: {
          id: storeOrderId,
          storeId,
        }
      })

      if (!storeOrder) {
        return NextResponse.json(
          { error: "Commande non trouvée" },
          { status: 404 }
        )
      }
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

    // Préparer les données des items
    const itemsData = await Promise.all(
      items.map(async (item: ReturnItemInput) => {
        // Récupérer les infos du produit
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
          }
        })

        if (!product) {
          throw new Error(`Produit non trouvé: ${item.productId}`)
        }

        // Récupérer les infos de la variante si présente
        let variantInfo = null
        if (item.variantId) {
          variantInfo = await prisma.productVariant.findUnique({
            where: { id: item.variantId },
            select: {
              id: true,
              name: true,
              sku: true,
              prixVente: true,
            }
          })
        }

        // Utiliser le prix de la variante si disponible, sinon celui du produit
        const unitPrice = item.unitPrice || variantInfo?.prixVente || product.prixVente

        // Préparer les données du produit d'échange si présent
        let exchangeData: any = {}
        if (item.exchangeProductId) {
          // Récupérer le nom du produit d'échange
          const exchangeProduct = await prisma.product.findUnique({
            where: { id: item.exchangeProductId },
            select: { name: true }
          })
          exchangeData = {
            exchangeProductId: item.exchangeProductId,
            exchangeProductName: exchangeProduct?.name || null,
            exchangeDiscount: item.exchangeDiscount || 0,
          }
        }

        return {
          productId: item.productId,
          variantId: item.variantId || null,
          productName: variantInfo?.name || product.name,
          productSku: variantInfo?.sku || product.sku,
          quantity: item.quantity,
          unitPrice,
          refundAmount: 0, // Sera défini lors du traitement
          reason: item.reason,
          reasonDetails: item.reasonDetails || null,
          condition: item.condition || "GOOD",
          isRefunded: false, // Sera défini lors du traitement
          ...exchangeData,
        }
      })
    )

    // Créer le retour avec ses items - Statut APPROVED par défaut
    const productReturn = await prisma.productReturn.create({
      data: {
        number: returnNumber,
        storeId,
        storeOrderId: storeOrderId || null,
        customerName: customerName || storeOrder?.customerName || null,
        customerPhone: customerPhone || storeOrder?.customerPhone || null,
        totalRefundAmount: 0, // Sera calculé lors du traitement
        status: "APPROVED", // Statut approuvé par défaut
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
                photos: true,
                prixVente: true,
              }
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
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

    // Enregistrer les mouvements de stock pour les produits retournés (entrée en stock)
    for (const item of itemsData) {
      // Mouvement de stock - Entrée (produit retourné)
      await prisma.stockMovement.create({
        data: {
          productId: item.productId,
          quantity: item.quantity,
          type: "RETURN",
          note: `Retour SAV - ${returnNumber} - ${item.reason}${item.variantId ? ` (Variante: ${item.variantId})` : ''}`,
          userId: session.user.id,
        }
      })

      // Mettre à jour le stock du produit principal
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } }
      })

      // Mettre à jour le stock du magasin
      await prisma.storeProduct.updateMany({
        where: { storeId, productId: item.productId },
        data: { stock: { increment: item.quantity } }
      })

      // Si variante, mettre à jour aussi le stock de la variante
      if (item.variantId) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } }
        })
      }

      // Si échange, enregistrer la sortie de stock du produit d'échange
      if (item.exchangeProductId) {
        // Mouvement de stock - Sortie (produit d'échange donné au client)
        await prisma.stockMovement.create({
          data: {
            productId: item.exchangeProductId,
            quantity: -item.quantity, // Négatif = sortie
            type: "EXIT",
            note: `Échange SAV - ${returnNumber} - Produit donné en échange de ${item.productName}`,
            userId: session.user.id,
          }
        })

        // Mettre à jour le stock du produit d'échange (décrémentation)
        await prisma.product.update({
          where: { id: item.exchangeProductId },
          data: { stock: { decrement: item.quantity } }
        })

        // Mettre à jour le stock du magasin pour le produit d'échange
        await prisma.storeProduct.updateMany({
          where: { storeId, productId: item.exchangeProductId },
          data: { stock: { decrement: item.quantity } }
        })

        console.log(`[SAV] Échange: Sortie de stock pour produit ${item.exchangeProductId} (-${item.quantity})`)
      }
    }

    console.log(`[SAV] Retour ${returnNumber} créé avec ${itemsData.length} articles - Stock mis à jour`)

    return NextResponse.json(productReturn, { status: 201 })
  } catch (error: any) {
    console.error("Erreur lors de la création du retour:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
