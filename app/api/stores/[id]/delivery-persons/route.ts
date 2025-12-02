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
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json({ error: "Magasin non trouvé" }, { status: 404 })
    }

    // Récupérer les livreurs du magasin
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        storeId: storeId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        vehicle: true,
        plateNumber: true,
        avatar: true,
        rating: true,
        totalDeliveries: true,
        deliveryZones: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({
      deliveryPersons,
      total: deliveryPersons.length,
    })
  } catch (error) {
    console.error("Error fetching store delivery persons:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des livreurs" },
      { status: 500 }
    )
  }
}
