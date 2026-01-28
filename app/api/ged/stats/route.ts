import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { GED_MAX_STORAGE_PER_USER } from "@/lib/s3"

// GET /api/ged/stats - Statistiques de stockage
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    // Calculer le stockage utilisé
    const storageResult = await prisma.gedFile.aggregate({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
      },
      _sum: { size: true },
      _count: true,
    })

    // Compter les dossiers
    const foldersCount = await prisma.gedFolder.count({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
      },
    })

    // Compter les fichiers par type
    const imageCount = await prisma.gedFile.count({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
        mimeType: { startsWith: "image/" },
      },
    })

    const videoCount = await prisma.gedFile.count({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
        mimeType: { startsWith: "video/" },
      },
    })

    const audioCount = await prisma.gedFile.count({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
        mimeType: { startsWith: "audio/" },
      },
    })

    const documentCount = await prisma.gedFile.count({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
        OR: [
          { mimeType: "application/pdf" },
          { mimeType: { contains: "document" } },
          { mimeType: { contains: "spreadsheet" } },
          { mimeType: { contains: "presentation" } },
          { mimeType: { startsWith: "text/" } },
        ],
      },
    })

    // Compter les éléments partagés
    const sharedWithMeCount = await prisma.gedShare.count({
      where: { sharedWithId: session.user.id },
    })

    const sharedByMeCount = await prisma.gedShare.count({
      where: { sharedById: session.user.id },
    })

    // Compter les éléments dans la corbeille
    const trashFilesCount = await prisma.gedFile.count({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
      },
    })

    const trashFoldersCount = await prisma.gedFolder.count({
      where: {
        ownerId: session.user.id,
        isDeleted: true,
      },
    })

    // Compter les favoris
    const favoritesCount = await prisma.gedFavorite.count({
      where: { userId: session.user.id },
    })

    const storageUsed = storageResult._sum.size || 0
    const storageLimit = GED_MAX_STORAGE_PER_USER
    const storagePercentage = Math.round((storageUsed / storageLimit) * 100)

    return NextResponse.json({
      storage: {
        used: storageUsed,
        limit: storageLimit,
        percentage: storagePercentage,
      },
      counts: {
        files: storageResult._count,
        folders: foldersCount,
        images: imageCount,
        videos: videoCount,
        audio: audioCount,
        documents: documentCount,
        sharedWithMe: sharedWithMeCount,
        sharedByMe: sharedByMeCount,
        trash: trashFilesCount + trashFoldersCount,
        favorites: favoritesCount,
      },
    })
  } catch (error) {
    console.error("[GED_STATS_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
