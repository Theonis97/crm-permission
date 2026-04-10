import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer l'historique des mouvements de stock d'un livreur
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
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les mouvements
    const movements = await prisma.deliveryStockMovement.findMany({
      where: {
        deliveryPersonId: id,
        ...(type && { type: type as any }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            photos: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            attributes: true,
          },
        },
        storeOrder: {
          select: {
            id: true,
            number: true,
            customerName: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    })

    // Compter le total
    const total = await prisma.deliveryStockMovement.count({
      where: {
        deliveryPersonId: id,
        ...(type && { type: type as any }),
      },
    })

    // Calculer les statistiques
    const stats = await prisma.deliveryStockMovement.groupBy({
      by: ["type"],
      where: {
        deliveryPersonId: id,
      },
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      movements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: total > offset + limit,
      },
      stats: stats.reduce(
        (acc, stat) => ({
          ...acc,
          [stat.type]: {
            count: stat._count.id,
            total: stat._sum.quantity || 0,
          },
        }),
        {}
      ),
    })
  } catch (error) {
    console.error("[DELIVERY_STOCK_MOVEMENTS_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mouvements" },
      { status: 500 }
    )
  }
}

// POST - Créer un mouvement de stock manuel (retour ou ajustement)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { productId, variantId, type, quantity, notes } = body

    if (!productId || !type || !quantity) {
      return NextResponse.json(
        { error: "Paramètres manquants" },
        { status: 400 }
      )
    }

    // Vérifier que le type est valide (RETURN ou ADJUSTMENT)
    if (!["RETURN", "ADJUSTMENT"].includes(type)) {
      return NextResponse.json(
        { error: "Type de mouvement invalide" },
        { status: 400 }
      )
    }

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        storeId: true,
        store: { select: { id: true, name: true } },
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Transaction pour créer le mouvement et mettre à jour les stocks
    const result = await prisma.$transaction(async (tx) => {
      // Récupérer le stock actuel du livreur
      const currentStock = await tx.deliveryPersonStock.findUnique({
        where: {
          deliveryPersonId_productId_variantId: {
            deliveryPersonId: id,
            productId,
            variantId: variantId || null,
          },
        },
      })

      // Calculer la nouvelle quantité
      const currentQuantity = currentStock?.quantity || 0
      const newQuantity = currentQuantity + quantity

      // Vérifier que la nouvelle quantité est valide
      if (newQuantity < 0) {
        throw new Error("La quantité résultante ne peut pas être négative")
      }

      // 1. Mettre à jour le stock du livreur
      await tx.deliveryPersonStock.upsert({
        where: {
          deliveryPersonId_productId_variantId: {
            deliveryPersonId: id,
            productId,
            variantId: variantId || null,
          },
        },
        update: {
          quantity: newQuantity,
        },
        create: {
          deliveryPersonId: id,
          productId,
          variantId: variantId || null,
          quantity: Math.max(0, quantity),
        },
      })

      // 2. Créer le mouvement
      const movement = await tx.deliveryStockMovement.create({
        data: {
          deliveryPersonId: id,
          productId,
          variantId: variantId || null,
          type,
          quantity,
          notes,
          createdById: user.id,
        },
        include: {
          product: true,
          variant: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // 3. Si c'est un retour, mettre à jour le stock du magasin
      if (type === "RETURN" && quantity > 0) {
        const storeProduct = await tx.storeProduct.findFirst({
          where: {
            storeId: deliveryPerson.storeId,
            productId,
          },
        })

        if (storeProduct) {
          await tx.storeProduct.update({
            where: { id: storeProduct.id },
            data: {
              stock: {
                increment: quantity,
              },
            },
          })

          // Créer un mouvement de stock pour le magasin (entrée)
          await tx.stockMovement.create({
            data: {
              productId,
              quantity,
              type: "RETURN",
              note: `Retour livreur: ${deliveryPerson.name}${notes ? ` - ${notes}` : ""}`,
              userId: user.id,
            },
          })
        }
      }

      return movement
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[DELIVERY_STOCK_MOVEMENTS_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création du mouvement" },
      { status: 500 }
    )
  }
}
