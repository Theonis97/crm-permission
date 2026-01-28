import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { deleteGedFile, getGedDownloadPresignedUrl, getGedPreviewPresignedUrl } from "@/lib/s3"

// GET /api/ged/files/[id] - Détails d'un fichier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action") // download, preview

    const file = await prisma.gedFile.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { ownerId: session.user.id },
          { shares: { some: { sharedWithId: session.user.id } } },
        ],
      },
      include: {
        folder: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, firstName: true, lastName: true } },
        shares: {
          include: {
            sharedWith: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    // Si action = download, retourner l'URL de téléchargement
    if (action === "download") {
      const downloadUrl = await getGedDownloadPresignedUrl(file.s3Key, file.name)
      if (!downloadUrl) {
        return NextResponse.json({ error: "Erreur lors de la génération du lien" }, { status: 500 })
      }
      return NextResponse.json({ downloadUrl })
    }

    // Si action = preview, retourner l'URL de prévisualisation
    if (action === "preview") {
      const previewUrl = await getGedPreviewPresignedUrl(file.s3Key)
      if (!previewUrl) {
        return NextResponse.json({ error: "Erreur lors de la génération du lien" }, { status: 500 })
      }
      return NextResponse.json({ previewUrl })
    }

    return NextResponse.json({ file })
  } catch (error) {
    console.error("[GED_FILE_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT /api/ged/files/[id] - Modifier un fichier (renommer, déplacer)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { name, folderId } = body

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await prisma.gedFile.findFirst({
      where: {
        id,
        ownerId: session.user.id,
        isDeleted: false,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    // Si on change le dossier, vérifier qu'il existe
    if (folderId !== undefined && folderId !== file.folderId) {
      if (folderId) {
        const folder = await prisma.gedFolder.findFirst({
          where: {
            id: folderId,
            ownerId: session.user.id,
            isDeleted: false,
          },
        })
        if (!folder) {
          return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
        }
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (folderId !== undefined) updateData.folderId = folderId || null

    const updatedFile = await prisma.gedFile.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ file: updatedFile })
  } catch (error) {
    console.error("[GED_FILE_PUT]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/ged/files/[id] - Supprimer un fichier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get("permanent") === "true"

    // Vérifier que le fichier existe et appartient à l'utilisateur
    const file = await prisma.gedFile.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
    })

    if (!file) {
      return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
    }

    if (permanent) {
      // Suppression définitive - supprimer aussi de S3
      await deleteGedFile(file.s3Key)
      if (file.thumbnailKey) {
        await deleteGedFile(file.thumbnailKey)
      }
      await prisma.gedFile.delete({ where: { id } })
      return NextResponse.json({ success: true, message: "Fichier supprimé définitivement" })
    } else {
      // Soft delete
      await prisma.gedFile.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
      return NextResponse.json({ success: true, message: "Fichier déplacé vers la corbeille" })
    }
  } catch (error) {
    console.error("[GED_FILE_DELETE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
