import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { v4 as uuidv4 } from "uuid"

// POST /api/ged/files/[id]/copy - Copier un fichier
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

    // Générer un nouveau nom pour la copie
    const copyName = `${file.name.replace(`.${file.extension}`, "")} (copie).${file.extension}`

    // Créer la copie du fichier (même clé S3, nouvelle entrée en base)
    const copiedFile = await prisma.gedFile.create({
      data: {
        name: copyName,
        originalName: file.originalName,
        s3Key: file.s3Key, // Même fichier S3
        s3Bucket: file.s3Bucket,
        mimeType: file.mimeType,
        size: file.size,
        extension: file.extension,
        thumbnailKey: file.thumbnailKey,
        folderId: targetFolderId || null,
        ownerId: session.user.id,
      },
    })

    return NextResponse.json({ file: copiedFile }, { status: 201 })
  } catch (error) {
    console.error("[GED_FILE_COPY]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
