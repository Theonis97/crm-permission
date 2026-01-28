import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/ged/favorites - Lister les favoris
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const favorites = await prisma.gedFavorite.findMany({
      where: { userId: session.user.id },
      include: {
        file: true,
        folder: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ favorites })
  } catch (error) {
    console.error("[GED_FAVORITES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/ged/favorites - Ajouter/Retirer un favori
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { fileId, folderId } = body

    if (!fileId && !folderId) {
      return NextResponse.json(
        { error: "fileId ou folderId requis" },
        { status: 400 }
      )
    }

    // Vérifier si le favori existe déjà
    const existingFavorite = await prisma.gedFavorite.findFirst({
      where: {
        userId: session.user.id,
        ...(fileId ? { fileId } : { folderId }),
      },
    })

    if (existingFavorite) {
      // Retirer le favori
      await prisma.gedFavorite.delete({
        where: { id: existingFavorite.id },
      })
      return NextResponse.json({ isFavorite: false, message: "Retiré des favoris" })
    } else {
      // Ajouter le favori
      await prisma.gedFavorite.create({
        data: {
          userId: session.user.id,
          fileId: fileId || null,
          folderId: folderId || null,
        },
      })
      return NextResponse.json({ isFavorite: true, message: "Ajouté aux favoris" }, { status: 201 })
    }
  } catch (error) {
    console.error("[GED_FAVORITES_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
