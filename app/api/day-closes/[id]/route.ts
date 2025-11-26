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

    const { id } = await params

    // Récupérer la clôture avec tous les détails
    const dayClose = await prisma.dayClose.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            email: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!dayClose) {
      return NextResponse.json({ error: "Clôture non trouvée" }, { status: 404 })
    }

    // Récupérer les mouvements de stock de la journée pour avoir le détail des ventes
    const startOfDay = new Date(dayClose.closeDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(dayClose.closeDate)
    endOfDay.setHours(23, 59, 59, 999)

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
              storeId: dayClose.storeId
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

    // Grouper les mouvements par transaction (comme dans l'autre API)
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
      const timeKey = new Date(movement.createdAt).toISOString().slice(0, 16)
      const transactionKey = `${timeKey}_${movement.userId}`
      
      if (!salesByTransaction.has(transactionKey)) {
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

    const sales = Array.from(salesByTransaction.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    const response = {
      id: dayClose.id,
      closeDate: dayClose.closeDate,
      store: dayClose.store,
      user: dayClose.user,
      totalSales: dayClose.totalSales,
      totalItems: dayClose.totalItems,
      subtotal: dayClose.subtotal,
      totalTax: dayClose.totalTax,
      totalDiscounts: dayClose.totalDiscounts,
      totalRevenue: dayClose.totalRevenue,
      notes: dayClose.notes,
      createdAt: dayClose.createdAt,
      updatedAt: dayClose.updatedAt,
      sales: sales.map(sale => ({
        id: sale.id,
        createdAt: sale.createdAt,
        customerName: sale.customerName,
        items: sale.items,
        itemCount: sale.itemCount,
        subtotal: sale.subtotal,
        tax: sale.tax,
        total: sale.total
      }))
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("[DAY_CLOSE_DETAIL_GET]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du détail" },
      { status: 500 }
    )
  }
}

// Fonction utilitaire pour extraire le nom du client depuis les notes
function extractCustomerNameFromNote(note: string | null): string | null {
  if (!note) return null
  
  const patterns = [
    /Vente POS \w+ - (.+?) \(/i,
    /Vente à (.+?)(?:\s|$)/i,
    /Client:?\s*(.+?)(?:\s|$)/i,
    /^(.+?)\s*-/i
  ]
  
  for (const pattern of patterns) {
    const match = note.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  
  return null
}
