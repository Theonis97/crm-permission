import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PATCH - Modifier une commande d'une autre sous-caisse (cross-caisse)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    // Décoder le token
    let decoded: any
    try {
      decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
    } catch {
      return NextResponse.json(
        { success: false, error: "Token invalide" },
        { status: 401 }
      )
    }

    // Vérifier l'expiration
    if (Date.now() > decoded.expiresAt) {
      return NextResponse.json(
        { success: false, error: "Session expirée" },
        { status: 401 }
      )
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { clientCode, totalDiscount } = body

    if (!clientCode) {
      return NextResponse.json(
        { success: false, error: "Code client requis" },
        { status: 400 }
      )
    }

    // Vérifier et mettre à jour la commande en une seule requête avec vérifications
    try {
      // D'abord, vérifier que la commande existe et appartient au bon magasin
      const existingOrder = await prisma.subBoxOrder.findFirst({
        where: {
          id: orderId,
        },
        select: {
          status: true,
          subBox: {
            select: {
              storeId: true,
              id: true,
              name: true,
              code: true,
            },
          },
        },
      })

      if (!existingOrder) {
        return NextResponse.json(
          { success: false, error: "Commande introuvable" },
          { status: 404 }
        )
      }

      // Vérifier que la commande appartient au même magasin que la sous-caisse actuelle
      if (existingOrder.subBox.storeId !== decoded.store.id) {
        return NextResponse.json(
          { success: false, error: "Commande non autorisée" },
          { status: 403 }
        )
      }

      // Vérifier que la commande est en attente
      if (existingOrder.status !== "PENDING") {
        return NextResponse.json(
          { success: false, error: "Commande non modifiable" },
          { status: 400 }
        )
      }

      // Mettre à jour la commande
      const updatedOrder = await prisma.subBoxOrder.update({
        where: { id: orderId },
        data: {
          clientCode: clientCode.toUpperCase(),
          totalDiscount: totalDiscount || 0,
        },
      })

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: "Commande modifiée avec succès",
        info: {
          originalSubBox: existingOrder.subBox,
          modifiedBy: decoded.subBoxId,
        },
      })
      
    } catch (error: any) {
      if (error.code === 'P2025') { // Prisma error code for "Record to update not found"
        return NextResponse.json(
          { success: false, error: "Commande introuvable ou non autorisée" },
          { status: 404 }
        )
      }
      throw error // Re-throw other errors
    }
  } catch (error) {
    console.error("[SUB_BOX_ORDER_CROSS_MODIFY]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la modification de la commande" },
      { status: 500 }
    )
  }
}