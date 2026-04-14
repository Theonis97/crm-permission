import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/stores/[id]/driver-return-requests/[reqId]/validate
 * Le gestionnaire du magasin approuve ou rejette une demande de retour livreur.
 *
 * Si approuvée :
 *  - DeliveryPersonStock.quantity diminue
 *  - StoreProduct.stock augmente
 *  - DeliveryStockMovement créé (RETURN côté livreur)
 *  - StockMovement créé (côté store — RETURN entrant)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reqId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId, reqId } = await params
    const body = await request.json()
    const { action, rejectionReason, approvedQuantity } = body as {
      action: "approve" | "reject"
      rejectionReason?: string
      approvedQuantity?: number
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action doit être 'approve' ou 'reject'" }, { status: 400 })
    }

    // Charger la demande
    const returnReq = await prisma.driverReturnRequest.findUnique({
      where: { id: reqId },
      include: {
        deliveryPerson: { select: { id: true, name: true, storeId: true } },
        product: { select: { id: true, name: true } },
      },
    })

    if (!returnReq) {
      return NextResponse.json({ error: "Demande introuvable" }, { status: 404 })
    }

    if (returnReq.storeId !== storeId) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    if (returnReq.status !== "PENDING") {
      return NextResponse.json(
        { error: `La demande est déjà ${returnReq.status === "APPROVED" ? "approuvée" : "rejetée"}` },
        { status: 400 }
      )
    }

    if (action === "reject") {
      await prisma.driverReturnRequest.update({
        where: { id: reqId },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason ?? null,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Retour de ${returnReq.deliveryPerson.name} rejeté`,
      })
    }

    // ── APPROBATION ──────────────────────────────────────────────────────────

    const qtyToApprove = approvedQuantity
      ? Math.min(approvedQuantity, returnReq.requestedQuantity)
      : returnReq.requestedQuantity

    if (qtyToApprove <= 0) {
      return NextResponse.json({ error: "La quantité approuvée doit être > 0" }, { status: 400 })
    }

    // Charger le stock item du livreur
    const stockItem = await prisma.deliveryPersonStock.findUnique({
      where: { id: returnReq.stockItemId },
    })

    if (!stockItem) {
      return NextResponse.json({ error: "Article de stock livreur introuvable" }, { status: 404 })
    }

    if (stockItem.quantity < qtyToApprove) {
      return NextResponse.json(
        {
          error: `Stock livreur insuffisant : ${stockItem.quantity} disponible(s), ${qtyToApprove} demandé(s)`,
        },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur validateur
    const validator = await prisma.user.findUnique({ where: { id: session.user.id } })
    const validatorName =
      validator
        ? [validator.firstName, validator.lastName].filter(Boolean).join(" ") || validator.email
        : "Gestionnaire"

    await prisma.$transaction(async (tx) => {
      // 1. Décrémenter le stock du livreur
      const newQty = stockItem.quantity - qtyToApprove
      if (newQty <= 0) {
        await tx.deliveryPersonStock.delete({ where: { id: stockItem.id } })
      } else {
        await tx.deliveryPersonStock.update({
          where: { id: stockItem.id },
          data: { quantity: { decrement: qtyToApprove } },
        })
      }

      // 2. Incrémenter ou créer le StoreProduct
      const storeProduct = await tx.storeProduct.findFirst({
        where: { storeId, productId: returnReq.productId },
      })

      if (storeProduct) {
        await tx.storeProduct.update({
          where: { id: storeProduct.id },
          data: { stock: { increment: qtyToApprove } },
        })
      } else {
        await tx.storeProduct.create({
          data: {
            storeId,
            productId: returnReq.productId,
            stock: qtyToApprove,
          },
        })
      }

      // 3. Mouvement côté livreur
      await tx.deliveryStockMovement.create({
        data: {
          deliveryPersonId: returnReq.deliveryPersonId,
          productId: returnReq.productId,
          variantId: returnReq.variantId ?? null,
          quantity: qtyToApprove,
          type: "RETURN",
          notes: `Retour en magasin validé par ${validatorName}${returnReq.notes ? ` — ${returnReq.notes}` : ""}`,
          createdById: session.user.id,
        },
      })

      // 4. Mettre à jour la demande
      await tx.driverReturnRequest.update({
        where: { id: reqId },
        data: {
          status: "APPROVED",
          approvedQuantity: qtyToApprove,
          approvedById: session.user.id,
          approvedAt: new Date(),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: `Retour de ${returnReq.deliveryPerson.name} approuvé — ${qtyToApprove} unité(s) réintégrée(s) dans le stock du magasin`,
    })
  } catch (error) {
    console.error("[STORE_DRIVER_RETURN_VALIDATE]", error)
    return NextResponse.json({ error: "Erreur lors de la validation" }, { status: 500 })
  }
}
