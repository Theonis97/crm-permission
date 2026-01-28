import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { deleteGedFile } from "@/lib/s3"

// GET /api/ged/trash - Liste des éléments dans la corbeille
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const [files, folders] = await Promise.all([
      prisma.gedFile.findMany({
        where: {
          ownerId: session.user.id,
          isDeleted: true,
        },
        orderBy: { deletedAt: "desc" },
      }),
      prisma.gedFolder.findMany({
        where: {
          ownerId: session.user.id,
          isDeleted: true,
          parentId: null, // Seulement les dossiers racine supprimés
        },
        include: {
          _count: {
            select: {
              children: true,
              files: true,
            },
          },
        },
        orderBy: { deletedAt: "desc" },
      }),
    ])

    return NextResponse.json({ files, folders })
  } catch (error) {
    console.error("[GED_TRASH_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/ged/trash/empty - Vider la corbeille
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    // Récupérer tous les fichiers supprimés pour les supprimer de S3
    const filesToDelete = await prisma.gedFile.findMany({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
      },
      select: { id: true, s3Key: true, thumbnailKey: true },
    })

    // Supprimer les fichiers de S3
    for (const file of filesToDelete) {
      await deleteGedFile(file.s3Key)
      if (file.thumbnailKey) {
        await deleteGedFile(file.thumbnailKey)
      }
    }

    // Supprimer définitivement de la base de données
    await prisma.gedFile.deleteMany({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
      },
    })

    await prisma.gedFolder.deleteMany({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Corbeille vidée",
      deletedFiles: filesToDelete.length,
    })
  } catch (error) {
    console.error("[GED_TRASH_EMPTY]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
