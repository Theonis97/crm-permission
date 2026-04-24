import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import type { Prisma, StockType } from "@prisma/client"

function parseDateBoundary(dateStr: string, endOfDay: boolean): Date {
  return new Date(dateStr + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"))
}

/** YYYY-MM-DD → bornes journée UTC ; sinon compat. `new Date(iso)` (anciens startDate/endDate). */
function parseMovementRangeBound(dateStr: string, endOfDay: boolean): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return parseDateBoundary(dateStr, endOfDay)
  }
  return new Date(dateStr)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !hasPermission(user, "warehouse.movements.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    // Récupérer les paramètres de recherche
    const searchParams = request.nextUrl.searchParams
    const type = searchParams.get("type") // ENTRY, EXIT, ADJUSTMENT, SALE, RETURN
    const productId = searchParams.get("productId")
    const fromStr =
      searchParams.get("from") || searchParams.get("startDate")
    const toStr = searchParams.get("to") || searchParams.get("endDate")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1)
    const limit = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50)
    )
    const skip = (page - 1) * limit

    const dateFilter: Prisma.DateTimeFilter | undefined =
      fromStr || toStr
        ? {
            ...(fromStr ? { gte: parseMovementRangeBound(fromStr, false) } : {}),
            ...(toStr ? { lte: parseMovementRangeBound(toStr, true) } : {}),
          }
        : undefined

    const where: Prisma.StockMovementWhereInput = {}

    if (type) {
      where.type = type as StockType
    }

    if (productId) {
      where.productId = productId
    }

    if (dateFilter) {
      where.createdAt = dateFilter
    }

    // Récupérer les mouvements avec pagination
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
              brand: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          lot: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ])

    return NextResponse.json({
      movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      period:
        fromStr || toStr ? { from: fromStr || null, to: toStr || null } : null,
    })
  } catch (error) {
    console.error("Error fetching stock movements:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mouvements" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !hasPermission(user, "warehouse.movements.create")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const data = await request.json()
    const { productId, quantity, type, note, lotId } = data

    if (!productId || !quantity || !type) {
      return NextResponse.json(
        { error: "Champs requis manquants" },
        { status: 400 }
      )
    }

    // Vérifier que le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: "Produit introuvable" },
        { status: 404 }
      )
    }

    // Créer le mouvement de stock
    const movement = await prisma.stockMovement.create({
      data: {
        productId,
        quantity: parseInt(quantity),
        type,
        note: note || null,
        userId: user.id,
        lotId: lotId || null,
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        lot: true,
      },
    })

    // Mettre à jour le stock du produit
    let newStock = product.stock

    if (type === "ENTRY" || type === "RETURN") {
      newStock += parseInt(quantity)
    } else if (type === "EXIT" || type === "SALE") {
      newStock -= parseInt(quantity)
    } else if (type === "ADJUSTMENT") {
      // Pour un ajustement, la quantité peut être positive ou négative
      newStock += parseInt(quantity)
    }

    // S'assurer que le stock ne devient pas négatif
    if (newStock < 0) {
      // Annuler le mouvement si le stock serait négatif
      await prisma.stockMovement.delete({
        where: { id: movement.id },
      })

      return NextResponse.json(
        { error: "Stock insuffisant pour cette opération" },
        { status: 400 }
      )
    }

    // Mettre à jour le stock
    await prisma.product.update({
      where: { id: productId },
      data: { stock: newStock },
    })

    return NextResponse.json(movement, { status: 201 })
  } catch (error) {
    console.error("Error creating stock movement:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du mouvement" },
      { status: 500 }
    )
  }
}
