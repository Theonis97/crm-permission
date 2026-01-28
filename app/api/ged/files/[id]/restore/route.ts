import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// POST /api/ged/files/[id]/restore - Restaurer un fichier de la corbeille
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await prisma.gedFile.findFirst({
      where: { id, ownerId: session.user.id, isDeleted: true },
    })

    if (!file) {
      return NextResponse.json({ error: "Fichier introuvable dans la corbeille" }, { status: 404 })
    }

    // Restaurer le fichier
    const restoredFile = await prisma.gedFile.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    })

    return NextResponse.json({ file: restoredFile })
  } catch (error) {
    console.error("[GED_FILE_RESTORE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
