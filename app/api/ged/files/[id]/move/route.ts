import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// POST /api/ged/files/[id]/move - Déplacer un fichier
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { targetFolderId } = body

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await prisma.gedFile.findFirst({
      where: { id, ownerId: session.user.id, isDeleted: false },
    })

    if (!file) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    // Vérifier que le dossier cible existe (si spécifié)
    if (targetFolderId) {
      const targetFolder = await prisma.gedFolder.findFirst({
        where: { id: targetFolderId, ownerId: session.user.id, isDeleted: false },
      })
      if (!targetFolder) {
        return NextResponse.json({ error: "Dossier cible introuvable" }, { status: 404 })
      }
    }

    // Déplacer le fichier
    const updatedFile = await prisma.gedFile.update({
      where: { id },
      data: { folderId: targetFolderId || null },
    })

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    console.error("[GED_FILE_MOVE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
