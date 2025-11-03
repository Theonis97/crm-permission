import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/delivery/persons
 * Récupère tous les livreurs actifs
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🚚 Récupération des livreurs...')
    
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`✅ ${deliveryPersons.length} livreurs trouvés`)

    return NextResponse.json({
      success: true,
      data: deliveryPersons
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des livreurs:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des livreurs' 
      },
      { status: 500 }
    )
  }
}
