import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

/**
 * GET — Stock tampon des produits retournés (magasin) + classement des plus retournés
 * ?ranking=1 — top produits par quantité cumulée
 * sinon — dernières entrées (take défaut 80)
 */
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
    const ranking = searchParams.get("ranking") === "1"
    const status = searchParams.get("status") || "pending"
    const take = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("take") || "80", 10) || 80)
    )

    const linesWhereBase: Prisma.StoreReturnedGoodsLineWhereInput = { storeId }
    if (status === "pending") {
      linesWhereBase.reintegratedAt = null
    } else if (status === "reintegrated") {
      linesWhereBase.reintegratedAt = { not: null }
    }

    if (ranking) {
      const grouped = await prisma.storeReturnedGoodsLine.groupBy({
        by: ["productId"],
        where: { storeId, reintegratedAt: null },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: "desc" } },
        take,
      })

      const productIds = grouped.map((g) => g.productId)
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          sku: true,
          photos: true,
          prixVente: true,
        },
      })
      const byId = Object.fromEntries(products.map((p) => [p.id, p]))

      return NextResponse.json({
        success: true,
        ranking: grouped.map((g) => ({
          productId: g.productId,
          totalQuantity: g._sum.quantity ?? 0,
          returnEvents: g._count.id,
          product: byId[g.productId] ?? null,
        })),
      })
    }

    const lines = await prisma.storeReturnedGoodsLine.findMany({
      where: linesWhereBase,
      orderBy:
        status === "reintegrated"
          ? { reintegratedAt: "desc" }
          : { createdAt: "desc" },
      take,
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
          select: { id: true, name: true, sku: true },
        },
        productReturn: {
          select: {
            number: true,
            trackingNumber: true,
            status: true,
            resolutionType: true,
          },
        },
        reintegratedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      lines,
      count: lines.length,
    })
  } catch (error) {
    console.error("[STORE_RETURNED_GOODS_GET]", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du stock retours" },
      { status: 500 }
    )
  }
}
