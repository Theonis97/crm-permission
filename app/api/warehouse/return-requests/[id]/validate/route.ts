import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * PATCH /api/warehouse/return-requests/[id]/validate
 * Valider (approuver ou rejeter) une demande de retour magasin → entrepôt
 *
 * Body: { action: "approve" | "reject", rejectionReason?: string, items?: [{id, approvedQuantity}] }
 *
 * Si approuvée :
 *  - StoreProduct.stock diminue (pour chaque item)
 *  - Product.stock augmente (stock entrepôt)
 *  - StockMovement RETURN créé (entrée entrepôt)
 *  - Mouvement magasin créé (sortie stock magasin)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      action,
      rejectionReason,
      items: approvedItems,
    } = body as {
      action: "approve" | "reject"
      rejectionReason?: string
      items?: Array<{ itemId: string; approvedQuantity: number }>
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "action doit être 'approve' ou 'reject'" }, { status: 400 })
    }

    // Charger la demande
    const returnRequest = await prisma.storeReturnRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, stock: true } },
          },
        },
        store: { select: { id: true, name: true } },
      },
    })

    if (!returnRequest) {
      return NextResponse.json({ error: "Demande de retour introuvable" }, { status: 404 })
    }

    if (returnRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `La demande est déjà ${returnRequest.status === "APPROVED" ? "approuvée" : "rejetée"}` },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur validateur
    const validator = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!validator) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    if (action === "reject") {
      // Rejet simple — aucun mouvement de stock
      const updated = await prisma.storeReturnRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: rejectionReason || null,
          validatedById: session.user.id,
          validatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Demande ${returnRequest.number} rejetée`,
        returnRequest: updated,
      })
    }

    // ── APPROBATION ──────────────────────────────────────────────────────────

    // Construire la map des quantités approuvées (ou utiliser requestedQuantity)
    const qtyMap = new Map<string, number>()
    if (approvedItems && approvedItems.length > 0) {
      for (const ai of approvedItems) {
        if (ai.approvedQuantity > 0) {
          qtyMap.set(ai.itemId, ai.approvedQuantity)
        }
      }
    } else {
      // Pas de qtés spécifiques → approuver tout ce qui a été demandé
      for (const item of returnRequest.items) {
        qtyMap.set(item.id, item.requestedQuantity)
      }
    }

    // Vérifier le stock magasin pour chaque produit approuvé
    const itemsToProcess = returnRequest.items.filter((item) => (qtyMap.get(item.id) ?? 0) > 0)

    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: returnRequest.storeId,
        productId: { in: itemsToProcess.map((i) => i.productId) },
      },
    })

    for (const item of itemsToProcess) {
      const sp = storeProducts.find((p) => p.productId === item.productId)
      const approvedQty = qtyMap.get(item.id) ?? 0
      if (!sp || sp.stock < approvedQty) {
        return NextResponse.json(
          {
            error: `Stock magasin insuffisant pour "${item.product.name}" : ${sp?.stock ?? 0} disponible(s), ${approvedQty} approuvé(s)`,
          },
          { status: 400 }
        )
      }
    }

    // Transaction : mouvements + mise à jour stocks + statut
    await prisma.$transaction(async (tx) => {
      const validatorName =
        [validator.firstName, validator.lastName].filter(Boolean).join(" ") || validator.email

      for (const item of itemsToProcess) {
        const approvedQty = qtyMap.get(item.id) ?? 0
        const sp = storeProducts.find((p) => p.productId === item.productId)!

        // 1. Mettre à jour la quantité approuvée dans l'item
        await tx.storeReturnRequestItem.update({
          where: { id: item.id },
          data: { approvedQuantity: approvedQty },
        })

        // 2. Décrémenter le stock du magasin
        await tx.storeProduct.update({
          where: { id: sp.id },
          data: { stock: { decrement: approvedQty } },
        })

        // 3. Incrémenter le stock entrepôt (Product.stock)
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: approvedQty } },
        })

        // 4. Mouvement entrepôt — RETURN (entrée)
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: approvedQty,
            type: "RETURN",
            note: `Retour depuis magasin "${returnRequest.store.name}" — Demande ${returnRequest.number}${item.notes ? ` — ${item.notes}` : ""}`,
            userId: session.user.id,
          },
        })
      }

      // 5. Mettre à jour le statut de la demande
      await tx.storeReturnRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          validatedById: session.user.id,
          validatedAt: new Date(),
        },
      })
    })

    const totalApproved = itemsToProcess.reduce((s, i) => s + (qtyMap.get(i.id) ?? 0), 0)

    return NextResponse.json({
      success: true,
      message: `Demande ${returnRequest.number} approuvée — ${totalApproved} unité(s) réintégrée(s) dans l'entrepôt`,
    })
  } catch (error) {
    console.error("[WAREHOUSE_RETURN_VALIDATE_PATCH]", error)
    return NextResponse.json({ error: "Erreur lors de la validation" }, { status: 500 })
  }
}
