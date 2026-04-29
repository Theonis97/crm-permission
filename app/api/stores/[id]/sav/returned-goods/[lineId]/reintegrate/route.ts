import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { catalogPricesSnapshot } from "@/lib/store-product-pricing"

/**
 * POST — Remet en stock vendable magasin une ligne du tampon « stock retours SAV »
 * (après contrôle / test produit).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    let userId = session.user.id as string | undefined
    if (!userId && session.user.email) {
      const u = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      })
      userId = u?.id
    }
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId, lineId } = await params

    const line = await prisma.storeReturnedGoodsLine.findFirst({
      where: { id: lineId, storeId },
      include: {
        productReturn: {
          select: { id: true, number: true, trackingNumber: true },
        },
      },
    })

    if (!line) {
      return NextResponse.json(
        { error: "Ligne stock retours introuvable pour ce magasin" },
        { status: 404 }
      )
    }

    if (line.reintegratedAt) {
      return NextResponse.json(
        { error: "Cette ligne a déjà été réintégrée au stock vendable" },
        { status: 400 }
      )
    }

    if (line.quantity <= 0) {
      return NextResponse.json(
        { error: "Quantité invalide pour la réintégration" },
        { status: 400 }
      )
    }

    const ref =
      line.productReturn?.trackingNumber ||
      line.productReturn?.number ||
      line.productReturnId

    await prisma.$transaction(async (tx) => {
      let storeProduct = await tx.storeProduct.findUnique({
        where: {
          storeId_productId: {
            storeId,
            productId: line.productId,
          },
        },
      })

      if (!storeProduct) {
        const p = await tx.product.findUnique({
          where: { id: line.productId },
          select: { prixVente: true, prixAchat: true },
        })
        storeProduct = await tx.storeProduct.create({
          data: {
            storeId,
            productId: line.productId,
            stock: 0,
            minStock: 0,
            ...(p ? catalogPricesSnapshot(p) : {}),
          },
        })
      }

      await tx.storeProduct.update({
        where: { id: storeProduct.id },
        data: { stock: { increment: line.quantity } },
      })

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          quantity: line.quantity,
          type: "ENTRY",
          note: `Réintégration stock SAV après contrôle — retour ${ref}`,
          userId,
        },
      })

      await tx.storeReturnedGoodsLine.update({
        where: { id: line.id },
        data: {
          reintegratedAt: new Date(),
          reintegratedById: userId,
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: "Produit réintégré au stock magasin",
    })
  } catch (error) {
    console.error("[STORE_RETURNED_GOODS_REINTEGRATE]", error)
    return NextResponse.json(
      { error: "Erreur lors de la réintégration" },
      { status: 500 }
    )
  }
}
