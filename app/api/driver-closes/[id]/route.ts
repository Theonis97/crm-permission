import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { calculateCommission } from "@/lib/commission-calculator"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    
    // L'ID est au format "driverId-YYYY-MM-DD"
    // La date est toujours au format YYYY-MM-DD (10 caractères)
    // Donc on prend les 10 derniers caractères comme date
    if (id.length < 12) { // Au minimum: "x-2025-01-01" = 11 caractères
      return NextResponse.json({ error: "ID invalide - format attendu: driverId-YYYY-MM-DD" }, { status: 400 })
    }
    
    const dateStr = id.slice(-10) // Les 10 derniers caractères (YYYY-MM-DD)
    const driverId = id.slice(0, -11) // Tout sauf les 11 derniers caractères (date + tiret)
    
    if (!driverId || !dateStr) {
      return NextResponse.json({ error: "ID invalide - driverId ou date manquant" }, { status: 400 })
    }

    // Valider le format de la date YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(dateStr)) {
      return NextResponse.json({ error: "Format de date invalide - attendu: YYYY-MM-DD" }, { status: 400 })
    }

    console.log(`🔍 Recherche clôture - ID: ${id}, DriverId: ${driverId}, Date: ${dateStr}`)

    const startDate = new Date(dateStr)
    const endDate = new Date(dateStr + "T23:59:59.999Z")
    
    // Vérifier que les dates sont valides
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 })
    }
    
    console.log(`📅 Période recherche: ${startDate.toISOString()} - ${endDate.toISOString()}`)

    // Récupérer toutes les commandes livrées par ce livreur à cette date
    const orders = await prisma.storeOrder.findMany({
      where: {
        deliveryPersonId: driverId,
        status: "DELIVERED",
        deliveredAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        deliveryZone: {
          select: {
            id: true,
            name: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
                photos: true
              }
            }
          }
        },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true
          }
        }
      },
      orderBy: {
        deliveredAt: 'asc'
      }
    })

    console.log(`📦 Commandes trouvées: ${orders.length}`)

    if (orders.length === 0) {
      console.log(`❌ Aucune commande livrée trouvée pour le livreur ${driverId} le ${dateStr}`)
      return NextResponse.json({ 
        error: "Clôture non trouvée", 
        details: `Aucune commande livrée trouvée pour le livreur ${driverId} le ${dateStr}` 
      }, { status: 404 })
    }

    // Calculer les totaux
    const totalDeliveries = orders.length
    const totalOrders = orders.length
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0)
    const totalCommission = orders.reduce((sum, order) => sum + calculateCommission(order.total || 0), 0)

    // Formater les livraisons pour l'affichage
    const deliveries = orders.map(order => {
      // Construire le nom complet du contact
      const contactName = order.contact 
        ? [order.contact.firstName, order.contact.lastName].filter(Boolean).join(' ').trim() || 'Client inconnu'
        : order.customerName || 'Client inconnu';
      
      return {
        id: order.id,
        orderNumber: order.number,
        customerName: contactName,
        customerPhone: order.contact?.phone || order.customerPhone || '',
        customerAddress: order.deliveryAddress || '',
        deliveredAt: order.deliveredAt?.toISOString() || '',
        orderValue: order.total || 0,
        commission: calculateCommission(order.total || 0),
        status: order.status,
        paymentMethod: order.paymentMethod || 'CASH',
        amountReceived: order.amountReceived || order.total || 0,
        changeGiven: order.changeGiven || 0,
        items: order.items.map(item => ({
          id: item.id,
          productName: item.product?.name,
          sku: item.product?.sku || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          total: (item.quantity * (item.unitPrice || 0)),
          photo: item.product?.photos?.[0] || null
        }))
      }
    })

    const driverCloseDetail = {
      id,
      closeDate: dateStr,
      driver: orders[0].deliveryPerson,
      zone: orders[0].deliveryZone,
      totalDeliveries,
      totalOrders,
      totalRevenue,
      totalCommission,
      createdAt: orders[orders.length - 1].deliveredAt?.toISOString() || new Date().toISOString(),
      deliveries
    }

    return NextResponse.json(driverCloseDetail)

  } catch (error) {
    console.error("Erreur lors de la récupération du détail de clôture:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}
