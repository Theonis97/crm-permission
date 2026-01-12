import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Générer un code client unique pour la sous-caisse SAV
function generateSAVClientCode(): string {
  const now = new Date()
  const day = now.getDate().toString().padStart(2, '0')
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `SAV-${day}${month}-${random}`
}

// POST - Envoyer un retour SAV à la caisse pour validation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId, returnId } = await params
    const body = await request.json()
    const { 
      resolutionType, // "EXCHANGE" ou "REFUND"
      items, // Détails des items avec échange/remboursement
      totalDiscount, // Rabais total accordé
      notes 
    } = body

    // Vérifier que le retour existe et appartient au magasin
    const productReturn = await prisma.productReturn.findFirst({
      where: {
        id: returnId,
        storeId,
      },
      include: {
        items: true
      }
    })

    if (!productReturn) {
      return NextResponse.json(
        { error: "Retour non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier que le retour est dans un état valide pour être envoyé à la caisse
    if (!["PENDING", "APPROVED"].includes(productReturn.status)) {
      return NextResponse.json(
        { error: `Ce retour ne peut pas être envoyé à la caisse (statut: ${productReturn.status})` },
        { status: 400 }
      )
    }

    // Valider le type de résolution
    if (!resolutionType || !["EXCHANGE", "REFUND"].includes(resolutionType)) {
      return NextResponse.json(
        { error: "Type de résolution invalide (EXCHANGE ou REFUND requis)" },
        { status: 400 }
      )
    }

    let totalRefundAmount = 0
    let totalCustomerAddition = 0

    // Traiter les items selon le type de résolution
    if (items && Array.isArray(items)) {
      for (const itemData of items) {
        const returnItem = productReturn.items.find(i => i.id === itemData.itemId)
        if (!returnItem) continue

        if (resolutionType === "REFUND") {
          // Remboursement
          const refundAmount = itemData.refundAmount ?? (returnItem.quantity * returnItem.unitPrice)
          totalRefundAmount += refundAmount

          await prisma.productReturnItem.update({
            where: { id: itemData.itemId },
            data: {
              isRefunded: true,
              refundAmount,
            }
          })
        } else if (resolutionType === "EXCHANGE") {
          // Échange
          if (itemData.exchangeProductId) {
            // Récupérer les infos du produit d'échange
            const exchangeProduct = await prisma.product.findUnique({
              where: { id: itemData.exchangeProductId },
              select: { name: true, prixVente: true }
            })

            if (exchangeProduct) {
              const exchangePrice = itemData.exchangeProductPrice ?? exchangeProduct.prixVente
              const returnValue = returnItem.quantity * returnItem.unitPrice
              const discount = itemData.exchangeDiscount || 0
              const customerAddition = Math.max(0, exchangePrice - returnValue - discount)

              totalCustomerAddition += customerAddition

              await prisma.productReturnItem.update({
                where: { id: itemData.itemId },
                data: {
                  isRefunded: false,
                  exchangeProductId: itemData.exchangeProductId,
                  exchangeProductName: exchangeProduct.name,
                  exchangeProductPrice: exchangePrice,
                  exchangeDiscount: discount,
                  customerAddition,
                }
              })
            }
          }
        }
      }
    } else {
      // Si pas d'items spécifiés, calculer automatiquement
      for (const item of productReturn.items) {
        if (resolutionType === "REFUND") {
          const refundAmount = item.quantity * item.unitPrice
          totalRefundAmount += refundAmount

          await prisma.productReturnItem.update({
            where: { id: item.id },
            data: {
              isRefunded: true,
              refundAmount,
            }
          })
        }
      }
    }

    // Trouver ou créer la sous-caisse SAV du magasin
    let savSubBox = await prisma.subBox.findFirst({
      where: {
        storeId,
        code: "SAV",
      }
    })

    if (!savSubBox) {
      // Créer la sous-caisse SAV si elle n'existe pas
      savSubBox = await prisma.subBox.create({
        data: {
          storeId,
          name: "SAV",
          code: "SAV",
          isActive: true,
        }
      })
      console.log(`[SAV] Sous-caisse SAV créée pour le magasin ${storeId}`)
    }

    // Préparer les items pour la commande SubBox
    // Type étendu pour gérer les montants à rendre (refund)
    const subBoxItems: { 
      productId: string; 
      name: string; 
      sku: string | null; 
      unitPrice: number; 
      discount: number; 
      quantity: number; 
      total: number;
      isRefund?: boolean; // true si c'est un remboursement (caisse rend monnaie)
    }[] = []
    
    // Variable pour tracker le montant total à rendre par la caisse
    let totalCashierRefund = 0
    
    if (resolutionType === "EXCHANGE") {
      // Pour un échange, calculer la différence entre produit retourné et produit d'échange
      // Remise par défaut = valeur du produit retourné (valeur de reprise)
      for (const item of productReturn.items) {
        if (item.exchangeProductId) {
          const exchangeProduct = await prisma.product.findUnique({
            where: { id: item.exchangeProductId },
            select: { id: true, name: true, sku: true, prixVente: true }
          })
          
          if (exchangeProduct) {
            const exchangePrice = item.exchangeProductPrice || exchangeProduct.prixVente
            // Valeur de reprise = prix du produit retourné × quantité
            const returnValue = item.unitPrice * item.quantity
            // Valeur du produit d'échange
            const exchangeValue = exchangePrice * item.quantity
            // Remise additionnelle accordée par le SAV (en plus de la valeur de reprise)
            const additionalDiscount = item.exchangeDiscount || 0
            // Différence = prix échange - valeur reprise - remise additionnelle
            const difference = exchangeValue - returnValue - additionalDiscount
            
            // Remise totale appliquée = valeur reprise + remise additionnelle
            const totalItemDiscount = returnValue + additionalDiscount
            
            // Montant à payer par le client (si différence positive)
            const customerAddition = Math.max(0, difference)
            // Montant à rendre par la caisse (si différence négative)
            const refundAmount = Math.max(0, -difference)
            
            totalCustomerAddition += customerAddition
            totalCashierRefund += refundAmount
            
            subBoxItems.push({
              productId: exchangeProduct.id,
              name: exchangeProduct.name,
              sku: exchangeProduct.sku,
              unitPrice: exchangePrice,
              discount: totalItemDiscount, // Remise = valeur reprise + remise SAV
              quantity: item.quantity,
              total: customerAddition, // Montant à payer (0 si caisse rend monnaie)
              isRefund: refundAmount > 0,
            })

            // Mettre à jour l'item avec les montants calculés
            await prisma.productReturnItem.update({
              where: { id: item.id },
              data: {
                customerAddition, // Montant à payer par le client
                refundAmount,     // Montant à rendre par la caisse
                exchangeDiscount: totalItemDiscount, // Remise totale appliquée
              }
            })

            console.log(`[SAV] Échange: ${item.productName} (${returnValue.toLocaleString()}F) → ${exchangeProduct.name} (${exchangeValue.toLocaleString()}F)`)
            console.log(`[SAV]   Remise: ${totalItemDiscount.toLocaleString()}F | À payer: ${customerAddition.toLocaleString()}F | À rendre: ${refundAmount.toLocaleString()}F`)
          }
        }
      }
    } else if (resolutionType === "REFUND") {
      // Pour un remboursement intégral, pas de produit d'échange
      // La caisse doit rendre le montant total des produits retournés
      for (const item of productReturn.items) {
        const refundAmount = item.quantity * item.unitPrice
        totalCashierRefund += refundAmount
        
        // Pas d'item SubBox pour un remboursement, juste une note
        console.log(`[SAV] Remboursement: ${item.productName} - ${refundAmount.toLocaleString()}F`)
      }
    }

    // Calculer les totaux pour la commande SubBox
    const subtotal = subBoxItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0)
    const subBoxTotalDiscount = subBoxItems.reduce((sum, item) => sum + item.discount, 0)
    const totalItems = subBoxItems.reduce((sum, item) => sum + item.quantity, 0)
    // Montant final = ce que le client doit payer (peut être 0)
    const finalAmount = subBoxItems.reduce((sum, item) => sum + item.total, 0)

    // Créer la commande SubBox SAV
    let subBoxOrder = null
    const clientCode = generateSAVClientCode()
    
    // Créer une SubBoxOrder pour les deux cas (EXCHANGE et REFUND)
    // Pour REFUND: montant négatif ou note spéciale
    // Pour EXCHANGE: montant à payer ou à rendre
    
    // Construire la note descriptive
    let orderNotes = `SAV - Retour ${productReturn.trackingNumber || productReturn.number} - ${productReturn.customerName || "Client"}`
    if (resolutionType === "REFUND") {
      orderNotes += ` | REMBOURSEMENT: ${totalRefundAmount.toLocaleString()} FCFA à rendre`
    } else if (resolutionType === "EXCHANGE") {
      if (totalCashierRefund > 0) {
        orderNotes += ` | ÉCHANGE: ${totalCashierRefund.toLocaleString()} FCFA à rendre au client`
      } else if (totalCustomerAddition > 0) {
        orderNotes += ` | ÉCHANGE: ${totalCustomerAddition.toLocaleString()} FCFA à encaisser`
      } else {
        orderNotes += ` | ÉCHANGE: 0 FCFA (même valeur)`
      }
    }

    if (resolutionType === "EXCHANGE" && subBoxItems.length > 0) {
      subBoxOrder = await prisma.subBoxOrder.create({
        data: {
          subBoxId: savSubBox.id,
          storeId,
          clientCode,
          status: "PENDING",
          subtotal,
          totalDiscount: subBoxTotalDiscount,
          totalItems,
          notes: orderNotes,
          items: {
            create: subBoxItems.map(item => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku,
              unitPrice: item.unitPrice,
              discount: item.discount,
              quantity: item.quantity,
              total: item.total,
            }))
          }
        },
        include: {
          items: true,
          subBox: true,
        }
      })
      
      console.log(`[SAV] Commande SubBox ÉCHANGE créée: ${clientCode} - À payer: ${finalAmount.toLocaleString()} FCFA | À rendre: ${totalCashierRefund.toLocaleString()} FCFA`)
    } else if (resolutionType === "REFUND") {
      // Pour un remboursement, créer une SubBoxOrder sans items mais avec le montant à rendre
      subBoxOrder = await prisma.subBoxOrder.create({
        data: {
          subBoxId: savSubBox.id,
          storeId,
          clientCode,
          status: "PENDING",
          subtotal: 0,
          totalDiscount: totalRefundAmount, // Le montant à rendre est stocké comme "remise"
          totalItems: productReturn.items.length,
          notes: orderNotes,
        },
        include: {
          items: true,
          subBox: true,
        }
      })
      
      console.log(`[SAV] Commande SubBox REMBOURSEMENT créée: ${clientCode} - À rendre: ${totalRefundAmount.toLocaleString()} FCFA`)
    }
    
    // Mettre à jour le totalRefundAmount pour inclure aussi les remboursements d'échange
    if (resolutionType === "EXCHANGE" && totalCashierRefund > 0) {
      totalRefundAmount = totalCashierRefund
    }

    // Mettre à jour le retour avec le statut AWAITING_CASHIER et lier à la commande SubBox
    const updatedReturn = await prisma.productReturn.update({
      where: { id: returnId },
      data: {
        status: "AWAITING_CASHIER",
        resolutionType,
        totalRefundAmount,
        totalCustomerAddition,
        totalDiscount: totalDiscount || 0,
        sentToCashier: true,
        sentToCashierAt: new Date(),
        sentToCashierById: session.user.id,
        processedById: session.user.id,
        processedAt: new Date(),
        savSubBoxOrderId: subBoxOrder?.id || null,
        resolution: notes || (resolutionType === "REFUND" 
          ? `Remboursement de ${totalRefundAmount.toLocaleString()} FCFA à rendre` 
          : totalCashierRefund > 0 
            ? `Échange - Caisse rend: ${totalCashierRefund.toLocaleString()} FCFA`
            : totalCustomerAddition > 0
              ? `Échange - Client paie: ${totalCustomerAddition.toLocaleString()} FCFA`
              : `Échange - Même valeur (0 FCFA)`),
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, photos: true, prixVente: true }
            },
            exchangeProduct: {
              select: { id: true, name: true, photos: true, prixVente: true }
            }
          }
        },
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        sentToCashierBy: {
          select: { id: true, name: true, email: true }
        },
        savSubBoxOrder: {
          include: {
            subBox: true,
            items: true,
          }
        }
      }
    })

    console.log(`[SAV] Retour ${productReturn.trackingNumber || productReturn.number} envoyé à la caisse - Type: ${resolutionType}`)

    return NextResponse.json({
      ...updatedReturn,
      subBoxOrder: subBoxOrder,
    })
  } catch (error: any) {
    console.error("Erreur lors de l'envoi à la caisse:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
