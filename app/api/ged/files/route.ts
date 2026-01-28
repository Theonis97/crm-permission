import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/ged/files - Liste des fichiers
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")
    const type = searchParams.get("type") // image, video, audio, document
    const search = searchParams.get("search")
    const includeShared = searchParams.get("includeShared") === "true"

    // Construire les conditions de recherche
    const where: any = {
      ownerId: session.user.id,
      isDeleted: false,
    }

    // Filtre par dossier
    if (folderId === "root") {
      where.folderId = null
    } else if (folderId) {
      where.folderId = folderId
    }

    // Filtre par type
    if (type) {
      switch (type) {
        case "image":
          where.mimeType = { startsWith: "image/" }
          break
        case "video":
          where.mimeType = { startsWith: "video/" }
          break
        case "audio":
          where.mimeType = { startsWith: "audio/" }
          break
        case "document":
          where.OR = [
            { mimeType: "application/pdf" },
            { mimeType: { contains: "document" } },
            { mimeType: { contains: "spreadsheet" } },
            { mimeType: { contains: "presentation" } },
            { mimeType: { startsWith: "text/" } },
          ]
          break
      }
    }

    // Recherche par nom
    if (search) {
      where.name = { contains: search, mode: "insensitive" }
    }

    const files = await prisma.gedFile.findMany({
      where,
      include: {
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    // Si includeShared, récupérer aussi les fichiers partagés
    let sharedFiles: any[] = []
    if (includeShared) {
      const shares = await prisma.gedShare.findMany({
        where: {
          sharedWithId: session.user.id,
          fileId: { not: null },
          file: { isDeleted: false },
        },
        include: {
          file: {
            include: {
              folder: { select: { id: true, name: true } },
              owner: { select: { id: true, name: true, firstName: true, lastName: true } },
            },
          },
          sharedBy: { select: { id: true, name: true, firstName: true, lastName: true } },
        },
      })
      sharedFiles = shares.map(s => ({
        ...s.file,
        isShared: true,
        sharedBy: s.sharedBy,
        permissions: {
          canEdit: s.canEdit,
          canDelete: s.canDelete,
          canShare: s.canShare,
        },
      }))
    }

    return NextResponse.json({
      files,
      sharedFiles,
    })
  } catch (error) {
    console.error("[GED_FILES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
