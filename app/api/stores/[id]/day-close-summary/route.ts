import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Récupérer l'utilisateur connecté
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true }
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, name: true }
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 })
    }

    // Obtenir la date d'aujourd'hui (début et fin de journée)
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    // Vérifier si la journée est déjà clôturée
    const existingDayClose = await prisma.dayClose.findUnique({
      where: {
        storeId_closeDate: {
          storeId: storeId,
          closeDate: todayDateOnly
        }
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    })

    // Récupérer tous les mouvements de stock de type SALE pour aujourd'hui
    const salesMovements = await prisma.stockMovement.findMany({
      where: {
        type: "SALE",
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        product: {
          storeProducts: {
            some: {
              storeId: storeId
            }
          }
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            prixVente: true,
            tva: true
          }
        },
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Grouper les mouvements par transaction (basé sur l'heure et l'utilisateur)
    const salesByTransaction = new Map<string, {
      id: string
      createdAt: Date
      customerName: string
      items: Array<{
        productName: string
        quantity: number
        unitPrice: number
        total: number
      }>
      itemCount: number
      subtotal: number
      tax: number
      total: number
    }>()

    salesMovements.forEach((movement) => {
      // Créer une clé unique basée sur l'heure (arrondie à la minute) et l'utilisateur
      const timeKey = new Date(movement.createdAt).toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
      const transactionKey = `${timeKey}_${movement.userId}`
      
      if (!salesByTransaction.has(transactionKey)) {
        // Extraire le nom du client depuis les notes si disponible
        const customerName = extractCustomerNameFromNote(movement.note) || 'Client anonyme'
        
        salesByTransaction.set(transactionKey, {
          id: transactionKey,
          createdAt: movement.createdAt,
          customerName,
          items: [],
          itemCount: 0,
          subtotal: 0,
          tax: 0,
          total: 0
        })
      }

      const transaction = salesByTransaction.get(transactionKey)!
      const itemTotal = movement.product.prixVente * Math.abs(movement.quantity)
      const itemTax = itemTotal * (movement.product.tva / 100)

      transaction.items.push({
        productName: movement.product.name,
        quantity: Math.abs(movement.quantity),
        unitPrice: movement.product.prixVente,
        total: itemTotal
      })

      transaction.itemCount += Math.abs(movement.quantity)
      transaction.subtotal += itemTotal
      transaction.tax += itemTax
      transaction.total = transaction.subtotal + transaction.tax
    })

    // Convertir en array et trier par date
    const sales = Array.from(salesByTransaction.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    // Calculer les totaux
    const totalSales = sales.length
    const totalItems = sales.reduce((sum, sale) => sum + sale.itemCount, 0)
    const subtotal = sales.reduce((sum, sale) => sum + sale.subtotal, 0)
    const totalTax = sales.reduce((sum, sale) => sum + sale.tax, 0)
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)

    // Pour l'instant, on ne calcule pas les remises car elles ne sont pas encore stockées
    // TODO: Ajouter le calcul des remises quand elles seront persistées
    const totalDiscounts = 0

    const summary = {
      storeName: store.name,
      date: today.toISOString().split('T')[0],
      totalSales,
      totalItems,
      subtotal,
      totalTax,
      totalDiscounts,
      totalRevenue,
      sales: sales.map(sale => ({
        id: sale.id,
        createdAt: sale.createdAt,
        customerName: sale.customerName,
        itemCount: sale.itemCount,
        total: sale.total
      })),
      isAlreadyClosed: !!existingDayClose,
      closedBy: existingDayClose?.user?.name || null,
      closedAt: existingDayClose?.createdAt || null
    }

    // Si la journée n'est pas encore clôturée, l'enregistrer
    if (!existingDayClose && totalSales > 0) {
      try {
        await prisma.dayClose.create({
          data: {
            storeId: storeId,
            userId: user.id,
            closeDate: todayDateOnly,
            totalSales,
            totalItems,
            subtotal,
            totalTax,
            totalDiscounts,
            totalRevenue,
            notes: `Clôture automatique - ${totalSales} vente${totalSales > 1 ? 's' : ''} effectuée${totalSales > 1 ? 's' : ''}`
          }
        })
        
        console.log(`✅ Journée clôturée pour le magasin ${store.name} par ${user.name}`)
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la clôture:', error)
        // On continue même si l'enregistrement échoue
      }
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error("[DAY_CLOSE_SUMMARY_GET]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du résumé" },
      { status: 500 }
    )
  }
}

// Fonction utilitaire pour extraire le nom du client depuis les notes
function extractCustomerNameFromNote(note: string | null): string | null {
  if (!note) return null
  
  // Chercher des patterns comme "Vente POS [numéro] - [Nom] ([téléphone])"
  const patterns = [
    /Vente POS \w+ - (.+?) \(/i, // Pattern pour nos nouvelles notes POS
    /Vente à (.+?)(?:\s|$)/i,
    /Client:?\s*(.+?)(?:\s|$)/i,
    /^(.+?)\s*-/i // Nom au début suivi d'un tiret
  ]
  
  for (const pattern of patterns) {
    const match = note.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}
