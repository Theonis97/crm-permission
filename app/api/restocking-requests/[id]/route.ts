import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/restocking-requests/[id]
 * Récupérer une demande d'approvisionnement spécifique
 */
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

    const restockingRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
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
                prixVente: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                attributes: true,
                prixVente: true,
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

    return NextResponse.json({
      success: true,
      data: restockingRequest,
    })
  } catch (error) {
    console.error("❌ Get restocking request error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération de la demande" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/restocking-requests/[id]
 * Mettre à jour une demande d'approvisionnement (statut, quantités approuvées, etc.)
 */
export async function PATCH(
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
    const { status, rejectionReason, items } = body

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

    // Vérifier que la demande existe
    const existingRequest = await prisma.restockingRequest.findUnique({
      where: { id },
      include: {
        items: true,
      },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Demande d'approvisionnement introuvable" },
        { status: 404 }
      )
    }

    // Vérifier que la demande peut être modifiée
    if (existingRequest.status === "COMPLETED") {
      return NextResponse.json(
        { success: false, error: "Cette demande a déjà été traitée" },
        { status: 400 }
      )
    }

    // Mettre à jour la demande et ses items
    const updatedRequest = await prisma.$transaction(async (tx) => {
      // 1. Mettre à jour la demande
      const updateData: any = {
        status,
        updatedAt: new Date(),
      }

      if (status === "APPROVED") {
        updateData.approvedById = user.id
        updateData.approvedAt = new Date()
      } else if (status === "REJECTED") {
        updateData.rejectionReason = rejectionReason
      }

      const request = await tx.restockingRequest.update({
        where: { id },
        data: updateData,
      })

      // 2. Mettre à jour les quantités approuvées des items si fourni
      if (items && Array.isArray(items)) {
        await Promise.all(
          items.map((item: any) =>
            tx.restockingRequestItem.update({
              where: { id: item.id },
              data: {
                approvedQuantity: item.approvedQuantity,
                notes: item.notes,
              },
            })
          )
        )
      }

      return request
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

    console.log(`✅ Demande d'approvisionnement ${id} mise à jour: ${status}`)

    return NextResponse.json({
      success: true,
      message: `Demande d'approvisionnement ${status.toLowerCase()}`,
      data: completeRequest,
    })
  } catch (error) {
    console.error("❌ Update restocking request error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la mise à jour de la demande" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/restocking-requests/[id]
 * Supprimer une demande d'approvisionnement (seulement si PENDING)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id } = await params

    // Vérifier que la demande existe et peut être supprimée
    const existingRequest = await prisma.restockingRequest.findUnique({
      where: { id },
    })

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: "Demande d'approvisionnement introuvable" },
        { status: 404 }
      )
    }

    if (existingRequest.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Seules les demandes en attente peuvent être supprimées" },
        { status: 400 }
      )
    }

    // Supprimer la demande (les items seront supprimés automatiquement via onDelete: Cascade)
    await prisma.restockingRequest.delete({
      where: { id },
    })

    console.log(`✅ Demande d'approvisionnement ${id} supprimée`)

    return NextResponse.json({
      success: true,
      message: "Demande d'approvisionnement supprimée avec succès",
    })
  } catch (error) {
    console.error("❌ Delete restocking request error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la suppression de la demande" },
      { status: 500 }
    )
  }
}
