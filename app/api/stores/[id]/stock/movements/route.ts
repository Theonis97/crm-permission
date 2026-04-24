import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma, StockType } from "@prisma/client"

function parseDateBoundary(dateStr: string, endOfDay: boolean): Date {
  return new Date(dateStr + (endOfDay ? "T23:59:59.999Z" : "T00:00:00.000Z"))
}

// GET - Récupérer les mouvements de stock du magasin
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
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50))
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0
    const type = searchParams.get("type")
    const fromStr = searchParams.get("from")
    const toStr = searchParams.get("to")

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer les produits du magasin
    const storeProducts = await prisma.storeProduct.findMany({
      where: { storeId: id },
      select: { productId: true },
    })

    const productIds = storeProducts.map((sp) => sp.productId)

    const dateFilter: Prisma.DateTimeFilter | undefined =
      fromStr || toStr
        ? {
            ...(fromStr ? { gte: parseDateBoundary(fromStr, false) } : {}),
            ...(toStr ? { lte: parseDateBoundary(toStr, true) } : {}),
          }
        : undefined

    // Récupérer les mouvements de stock
    const movements = await prisma.stockMovement.findMany({
      where: {
        productId: { in: productIds },
        ...(type && { type: type as StockType }),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        user: {
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
    const total = await prisma.stockMovement.count({
      where: {
        productId: { in: productIds },
        ...(type && { type: type as StockType }),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
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
      period: fromStr || toStr ? { from: fromStr || null, to: toStr || null } : null,
    })
  } catch (error) {
    console.error("[STORE_STOCK_MOVEMENTS_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des mouvements" },
      { status: 500 }
    )
  }
}
