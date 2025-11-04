import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/delivery/zones
 * Récupère toutes les zones de livraison actives
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🗺️ Récupération des zones de livraison...')
    
    const zones = await prisma.deliveryZone.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        color: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`✅ ${zones.length} zones trouvées`)

    return NextResponse.json({
      success: true,
      data: zones
    })

  } catch (error) {
    console.error('❌ Erreur lors de la récupération des zones:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erreur lors de la récupération des zones' 
      },
      { status: 500 }
    )
  }
}
