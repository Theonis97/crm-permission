import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// PUT /api/ged/shares/[id] - Modifier les permissions d'un partage
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { canEdit, canDelete, canShare, expiresAt } = body

    // Vérifier que le partage existe et appartient à l'utilisateur
    const share = await prisma.gedShare.findFirst({
      where: { id, sharedById: session.user.id },
    })

    if (!share) {
      return NextResponse.json({ error: "Partage introuvable" }, { status: 404 })
    }

    const updatedShare = await prisma.gedShare.update({
      where: { id },
      data: {
        canEdit: canEdit !== undefined ? canEdit : share.canEdit,
        canDelete: canDelete !== undefined ? canDelete : share.canDelete,
        canShare: canShare !== undefined ? canShare : share.canShare,
        expiresAt: expiresAt !== undefined ? (expiresAt ? new Date(expiresAt) : null) : share.expiresAt,
      },
      include: {
        sharedWith: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json({ share: updatedShare })
  } catch (error) {
    console.error("[GED_SHARE_PUT]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/ged/shares/[id] - Supprimer un partage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que le partage existe et appartient à l'utilisateur (ou est partagé avec lui)
    const share = await prisma.gedShare.findFirst({
      where: {
        id,
        OR: [
          { sharedById: session.user.id },
          { sharedWithId: session.user.id },
        ],
      },
    })

    if (!share) {
      return NextResponse.json({ error: "Partage introuvable" }, { status: 404 })
    }

    await prisma.gedShare.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "Partage supprimé" })
  } catch (error) {
    console.error("[GED_SHARE_DELETE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
