import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * POST /api/restocking-requests/[id]/approve
 * Approuver une demande d'approvisionnement et effectuer le transfert de stock
 */
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
    const { items: rawItems } = body

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Liste d'articles manquante ou vide",
          message: "Liste d'articles manquante ou vide",
        },
        { status: 400 },
      )
    }

    const normVariantId = (v: string | null | undefined): string | null =>
      v == null || v === "" ? null : v

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Utilisateur introuvable" },
        { status: 404 }
      )
    }

    // Vérifier que la demande existe et peut être approuvée
    const restockingRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
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
          },
        },
      },
    })

    if (!restockingRequest) {
      return NextResponse.json(
        { success: false, error: "Demande d'approvisionnement introuvable" },
        { status: 404 }
      )
    }

    if (restockingRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Cette demande a déjà été traitée", message: "Cette demande a déjà été traitée" },
        { status: 400 }
      )
    }

    const overrideById = new Map<string, number>()
    for (const row of rawItems as Array<{ id?: string; approvedQuantity?: unknown }>) {
      if (row?.id == null) {
        return NextResponse.json(
          { success: false, error: "Identifiant de ligne manquant", message: "Identifiant de ligne manquant" },
          { status: 400 },
        )
      }
      const q = Number(row.approvedQuantity)
      if (!Number.isFinite(q) || q < 0) {
        return NextResponse.json(
          { success: false, error: "Quantité approuvée invalide", message: "Quantité approuvée invalide" },
          { status: 400 },
        )
      }
      overrideById.set(String(row.id), Math.floor(q))
    }

    const requestItemIds = new Set(restockingRequest.items.map((ri) => ri.id))
    for (const idKey of overrideById.keys()) {
      if (!requestItemIds.has(idKey)) {
        return NextResponse.json(
          { success: false, error: "Ligne de demande inconnue", message: "Ligne de demande inconnue" },
          { status: 400 },
        )
      }
    }

    const lines = restockingRequest.items.map((ri) => {
      const overridden = overrideById.has(ri.id) ? overrideById.get(ri.id)! : ri.requestedQuantity
      const approvedQuantity = Math.min(Math.max(0, overridden), ri.requestedQuantity)
      return { requestItem: ri, approvedQuantity }
    })

    const totalApproved = lines.reduce((s, l) => s + l.approvedQuantity, 0)
    if (totalApproved < 1) {
      return NextResponse.json(
        {
          success: false,
          error: "Indiquez au moins une quantité positive à approuver.",
          message: "Indiquez au moins une quantité positive à approuver.",
        },
        { status: 400 },
      )
    }

    const productIds = [
      ...new Set(
        lines.filter((l) => l.approvedQuantity > 0).map((l) => l.requestItem.productId),
      ),
    ]

    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId: restockingRequest.storeId,
        productId: { in: productIds },
      },
    })

    type StockValidation = {
      storeProductId: string
      productId: string
      variantId: string | null
      quantity: number
      requestItemId: string
    }

    const stockValidations: StockValidation[] = []

    for (const line of lines) {
      if (line.approvedQuantity < 1) continue

      const storeProduct = storeProducts.find((sp) => sp.productId === line.requestItem.productId)
      if (!storeProduct) {
        return NextResponse.json(
          {
            success: false,
            error: `Le produit « ${line.requestItem.product.name} » n'est pas associé à ce magasin (stock magasin).`,
            message: `Le produit « ${line.requestItem.product.name} » n'est pas associé à ce magasin (stock magasin).`,
          },
          { status: 400 },
        )
      }

      stockValidations.push({
        storeProductId: storeProduct.id,
        productId: line.requestItem.productId,
        variantId: normVariantId(line.requestItem.variantId),
        quantity: line.approvedQuantity,
        requestItemId: line.requestItem.id,
      })
    }

    const demandByStoreProductId = new Map<string, number>()
    for (const v of stockValidations) {
      demandByStoreProductId.set(
        v.storeProductId,
        (demandByStoreProductId.get(v.storeProductId) || 0) + v.quantity,
      )
    }

    for (const [storeProductId, demand] of demandByStoreProductId) {
      const sp = storeProducts.find((s) => s.id === storeProductId)
      const label =
        stockValidations.find((x) => x.storeProductId === storeProductId)?.productId ?? ""
      const name =
        restockingRequest.items.find((i) => i.productId === label)?.product.name ?? "Produit"
      if (!sp || sp.stock < demand) {
        return NextResponse.json(
          {
            success: false,
            error: `Stock insuffisant pour ${name}. Disponible : ${sp?.stock ?? 0}, besoin total : ${demand}.`,
            message: `Stock insuffisant pour ${name}. Disponible : ${sp?.stock ?? 0}, besoin total : ${demand}.`,
          },
          { status: 400 },
        )
      }
    }

    // Transaction optimisée avec timeout augmenté
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      console.log(`🔄 Starting transaction for request ${id}`)
      
      // 1. Mettre à jour la demande et les items en une seule fois
      const updatedRequest = await tx.restockingRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          approvedById: user.id,
          approvedAt: new Date(),
        },
      })

      // 2. Mettre à jour les quantités approuvées (toutes les lignes, y compris 0)
      await Promise.all(
        lines.map((line) =>
          tx.restockingRequestItem.update({
            where: { id: line.requestItem.id },
            data: {
              approvedQuantity: line.approvedQuantity,
            },
          }),
        ),
      )

      console.log(`✅ Updated request and items for ${id}`)

      // 3. Sortie magasin : une décrémentation + un mouvement par produit (total des lignes)
      const decrementByStoreProduct = new Map<string, { productId: string; total: number }>()
      for (const v of stockValidations) {
        const cur = decrementByStoreProduct.get(v.storeProductId) || {
          productId: v.productId,
          total: 0,
        }
        cur.total += v.quantity
        decrementByStoreProduct.set(v.storeProductId, cur)
      }

      const storeOps = []
      for (const [storeProductId, { productId, total }] of decrementByStoreProduct) {
        storeOps.push(
          tx.storeProduct.update({
            where: { id: storeProductId },
            data: { stock: { decrement: total } },
          }),
        )
        storeOps.push(
          tx.stockMovement.create({
            data: {
              productId,
              quantity: -total,
              type: "TRANSFER_OUT",
              note: `Transfert vers livreur ${restockingRequest.deliveryPerson.name} — demande ${id} (${stockValidations.filter((s) => s.productId === productId).length} ligne(s))`,
              userId: user.id,
            },
          }),
        )
      }

      // 4. Entrée stock livreur : regrouper par (productId, variantId) pour éviter créations en double dans la même transaction
      const deliveryGroups = new Map<
        string,
        { productId: string; variantId: string | null; quantity: number }
      >()
      for (const v of stockValidations) {
        const key = `${v.productId}\0${v.variantId ?? ""}`
        const g = deliveryGroups.get(key) || {
          productId: v.productId,
          variantId: v.variantId,
          quantity: 0,
        }
        g.quantity += v.quantity
        deliveryGroups.set(key, g)
      }

      const deliveryOps = []
      for (const g of deliveryGroups.values()) {
        const existing = await tx.deliveryPersonStock.findFirst({
          where: {
            deliveryPersonId: restockingRequest.deliveryPersonId,
            productId: g.productId,
            variantId: g.variantId,
          },
        })

        if (existing) {
          deliveryOps.push(
            tx.deliveryPersonStock.update({
              where: { id: existing.id },
              data: { quantity: { increment: g.quantity } },
            }),
          )
        } else {
          deliveryOps.push(
            tx.deliveryPersonStock.create({
              data: {
                deliveryPersonId: restockingRequest.deliveryPersonId,
                productId: g.productId,
                variantId: g.variantId,
                quantity: g.quantity,
              },
            }),
          )
        }

        deliveryOps.push(
          tx.deliveryStockMovement.create({
            data: {
              deliveryPersonId: restockingRequest.deliveryPersonId,
              productId: g.productId,
              variantId: g.variantId,
              type: "SUPPLY",
              quantity: g.quantity,
              notes: `Approvisionnement depuis magasin — demande ${id}`,
              createdById: user.id,
            },
          }),
        )
      }

      console.log(`🔄 Executing stock operations for ${id}`)
      await Promise.all([...storeOps, ...deliveryOps])

      console.log(`✅ Completed stock operations for ${id}`)

      // 4. Marquer la demande comme terminée
      await tx.restockingRequest.update({
        where: { id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })

      console.log(`✅ Transaction completed for ${id}`)
      return updatedRequest
    }, {
      timeout: 15000, // Augmenter le timeout à 15 secondes
    })

    // Récupérer la demande complète mise à jour
    const completeRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
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
          },
        },
      },
    })

    console.log(`✅ Demande d'approvisionnement ${id} approuvée et stock transféré`)
    console.log(`📦 ${stockValidations.length} produits transférés vers ${restockingRequest.deliveryPerson.name}`)

    return NextResponse.json({
      success: true,
      message: "Demande approuvée et stock transféré avec succès",
      data: completeRequest,
    })
  } catch (error) {
    console.error("❌ Approve restocking request error:", error)
    const msg =
      error instanceof Error && error.message
        ? error.message
        : "Erreur lors de l'approbation de la demande"
    return NextResponse.json({ success: false, error: msg, message: msg }, { status: 500 })
  }
}
