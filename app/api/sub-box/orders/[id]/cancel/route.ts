import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PATCH - Annuler une commande sous-caisse
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

    // Vérifier que la commande existe et appartient à la sous-caisse
    const existingOrder = await prisma.subBoxOrder.findFirst({
      where: {
        id: orderId,
        subBoxId: decoded.subBoxId,
        status: "PENDING", // Seules les commandes en attente peuvent être annulées
      },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: "Commande introuvable ou non annulable" },
        { status: 404 }
      )
    }

    // Mettre à jour le statut de la commande à CANCELLED
    const updatedOrder = await prisma.subBoxOrder.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: "Commande annulée avec succès",
    })
  } catch (error) {
    console.error("[SUB_BOX_ORDER_CANCEL]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'annulation de la commande" },
      { status: 500 }
    )
  }
}