import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// POST /api/ged/folders/[id]/restore - Restaurer un dossier de la corbeille
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    // Vérifier que le dossier existe et appartient à l'utilisateur
    const folder = await prisma.gedFolder.findFirst({
      where: { id, ownerId: session.user.id, isDeleted: true },
    })

    if (!folder) {
      return NextResponse.json({ error: "Dossier introuvable dans la corbeille" }, { status: 404 })
    }

    // Restaurer le dossier
    await prisma.gedFolder.update({
      where: { id },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    })

    // Restaurer les fichiers du dossier
    await prisma.gedFile.updateMany({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
        folderId: id,
      },
      data: {
        isDeleted: false,
        deletedAt: null,
      },
    })

    return NextResponse.json({ success: true, message: "Dossier restauré" })
  } catch (error) {
    console.error("[GED_FOLDER_RESTORE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
