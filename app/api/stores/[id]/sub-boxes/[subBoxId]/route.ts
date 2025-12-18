import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Récupérer une sous-caisse spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBoxId: string }> }
) {
  try {
    const { id: storeId, subBoxId } = await params

    const subBox = await prisma.subBox.findFirst({
      where: {
        id: subBoxId,
        storeId,
      },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    if (!subBox) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse introuvable" },
        { status: 404 }
      )
    }

    const pendingCount = await prisma.subBoxOrder.count({
      where: {
        subBoxId: subBox.id,
        status: "PENDING",
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...subBox,
        totalOrders: subBox._count.orders,
        pendingOrders: pendingCount,
      },
    })
  } catch (error) {
    console.error("[SUB_BOX_GET]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de la sous-caisse" },
      { status: 500 }
    )
  }
}

// PATCH - Modifier une sous-caisse
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBoxId: string }> }
) {
  try {
    const { id: storeId, subBoxId } = await params
    const body = await request.json()
    const { name, code, isActive } = body

    // Vérifier que la sous-caisse existe
    const existingSubBox = await prisma.subBox.findFirst({
      where: {
        id: subBoxId,
        storeId,
      },
    })

    if (!existingSubBox) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse introuvable" },
        { status: 404 }
      )
    }

    // Si le code change, vérifier qu'il n'existe pas déjà
    if (code && code.toUpperCase() !== existingSubBox.code) {
      const codeExists = await prisma.subBox.findFirst({
        where: {
          storeId,
          code: code.toUpperCase(),
          id: { not: subBoxId },
        },
      })

      if (codeExists) {
        return NextResponse.json(
          { success: false, error: "Ce code de sous-caisse existe déjà" },
          { status: 400 }
        )
      }
    }

    const updatedSubBox = await prisma.subBox.update({
      where: { id: subBoxId },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.toUpperCase().trim() }),
        ...(typeof isActive === "boolean" && { isActive }),
      },
    })

    return NextResponse.json({
      success: true,
      data: updatedSubBox,
    })
  } catch (error) {
    console.error("[SUB_BOX_PATCH]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la modification de la sous-caisse" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une sous-caisse
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; subBoxId: string }> }
) {
  try {
    const { id: storeId, subBoxId } = await params

    // Vérifier que la sous-caisse existe
    const existingSubBox = await prisma.subBox.findFirst({
      where: {
        id: subBoxId,
        storeId,
      },
    })

    if (!existingSubBox) {
      return NextResponse.json(
        { success: false, error: "Sous-caisse introuvable" },
        { status: 404 }
      )
    }

    // Vérifier s'il y a des commandes en attente
    const pendingOrders = await prisma.subBoxOrder.count({
      where: {
        subBoxId,
        status: "PENDING",
      },
    })

    if (pendingOrders > 0) {
      return NextResponse.json(
        { success: false, error: `Impossible de supprimer: ${pendingOrders} commande(s) en attente` },
        { status: 400 }
      )
    }

    await prisma.subBox.delete({
      where: { id: subBoxId },
    })

    return NextResponse.json({
      success: true,
      message: "Sous-caisse supprimée avec succès",
    })
  } catch (error) {
    console.error("[SUB_BOX_DELETE]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la suppression de la sous-caisse" },
      { status: 500 }
    )
  }
}
