import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma, ProductReturnReason, ProductCondition } from "@prisma/client"

/** Numéros RET-/SAV- uniques (contrainte globale sur `number` et `tracking_number`). */
function generateSavReturnNumbers() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const unique = randomUUID().replace(/-/g, "")
  return {
    returnNumber: `RET-${dateStr}-${unique}`,
    trackingNumber: `SAV-${dateStr}-${unique}`,
  }
}

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

    const createdByUser = session.user.email
      ? await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true },
        })
      : null
    const createdById =
      createdByUser?.id ?? (session.user as { id?: string }).id
    if (!createdById) {
      return NextResponse.json(
        { error: "Utilisateur non résolu (session)" },
        { status: 401 }
      )
    }

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

    // Créer le retour avec ses items - Statut PENDING par défaut (retry si collision rare sur number / tracking_number)
    const createInclude = {
      storeOrder: {
        select: {
          id: true,
          number: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              photos: true,
              prixVente: true,
            },
          },
          variant: {
            select: {
              id: true,
              name: true,
              sku: true,
            },
          },
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    } as const

    let productReturn!: Awaited<ReturnType<typeof prisma.productReturn.create>>
    const maxAttempts = 5
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const nums = generateSavReturnNumbers()
      try {
        productReturn = await prisma.productReturn.create({
          data: {
            number: nums.returnNumber,
            trackingNumber: nums.trackingNumber,
            storeId,
            storeOrderId: storeOrderId || null,
            customerName: customerName || storeOrder?.customerName || null,
            customerPhone: customerPhone || storeOrder?.customerPhone || null,
            totalRefundAmount: 0,
            totalCustomerAddition: 0,
            totalDiscount: 0,
            status: "PENDING",
            notes,
            createdById,
            items: {
              create: itemsData,
            },
          },
          include: createInclude,
        })
        break
      } catch (err) {
        const isUnique =
          err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
        if (!isUnique || attempt === maxAttempts - 1) {
          throw err
        }
      }
    }

    // NOTE: Le stock n'est PAS modifié à la création du retour
    // Le stock du produit d'échange sera décrémenté uniquement lors de la validation par la caisse
    // Cela permet au SAV de préparer la demande sans impacter le stock immédiatement

    console.log(
      `[SAV] Retour ${productReturn.number} créé avec ${itemsData.length} articles - En attente de traitement`
    )

    return NextResponse.json(productReturn, { status: 201 })
  } catch (error: any) {
    console.error("Erreur lors de la création du retour:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
