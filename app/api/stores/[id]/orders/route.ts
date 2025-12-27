import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

// GET - Rechercher les commandes d'un magasin
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
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const limit = parseInt(searchParams.get("limit") || "50")

    // Construire les conditions de recherche
    const whereConditions: any = {
      storeId,
    }

    // Filtre par statut
    if (status) {
      const statuses = status.split(",").map(s => s.trim())
      // Filtrer pour ne garder que les statuts valides de l'enum OrderStatus
      const validStatuses = statuses.filter(s => Object.values(OrderStatus).includes(s as OrderStatus))
      
      if (validStatuses.length > 0) {
        whereConditions.status = { in: validStatuses }
      }
    }

    // Recherche par téléphone, nom ou numéro de commande
    if (search) {
      whereConditions.OR = [
        { customerPhone: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { number: { contains: search, mode: "insensitive" } },
      ]
    }

    const orders = await prisma.storeOrder.findMany({
      where: whereConditions,
      include: {
        items: {
          select: {
            id: true,
            productId: true,
            name: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            total: true,
          }
        },
        deliveryPerson: {
          select: {
            id: true,
            name: true,
          }
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Erreur lors de la recherche des commandes:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
