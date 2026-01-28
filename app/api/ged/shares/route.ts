import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/ged/shares - Liste des éléments partagés avec moi
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const byMe = searchParams.get("byMe") === "true"

    if (byMe) {
      // Éléments que j'ai partagés
      const shares = await prisma.gedShare.findMany({
        where: { sharedById: session.user.id },
        include: {
          file: {
            select: { id: true, name: true, mimeType: true, size: true },
          },
          folder: {
            select: { id: true, name: true },
          },
          sharedWith: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ shares })
    } else {
      // Éléments partagés avec moi
      const shares = await prisma.gedShare.findMany({
        where: { sharedWithId: session.user.id },
        include: {
          file: {
            include: {
              owner: { select: { id: true, name: true, firstName: true, lastName: true } },
            },
          },
          folder: {
            include: {
              owner: { select: { id: true, name: true, firstName: true, lastName: true } },
            },
          },
          sharedBy: {
            select: { id: true, name: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      })
      return NextResponse.json({ shares })
    }
  } catch (error) {
    console.error("[GED_SHARES_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/ged/shares - Créer un partage
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { fileId, folderId, sharedWithId, canEdit, canDelete, canShare, expiresAt } = body

    // Vérifier qu'on partage soit un fichier soit un dossier
    if (!fileId && !folderId) {
      return NextResponse.json(
        { error: "Vous devez spécifier un fichier ou un dossier à partager" },
        { status: 400 }
      )
    }

    if (fileId && folderId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas partager un fichier et un dossier en même temps" },
        { status: 400 }
      )
    }

    if (!sharedWithId) {
      return NextResponse.json(
        { error: "Vous devez spécifier un utilisateur avec qui partager" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: sharedWithId },
    })
    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 })
    }

    // Vérifier que l'élément appartient à l'utilisateur
    if (fileId) {
      const file = await prisma.gedFile.findFirst({
        where: { id: fileId, ownerId: session.user.id, isDeleted: false },
      })
      if (!file) {
        return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 })
      }

      // Vérifier si le partage existe déjà
      const existingShare = await prisma.gedShare.findFirst({
        where: { fileId, sharedWithId },
      })
      if (existingShare) {
        return NextResponse.json(
          { error: "Ce fichier est déjà partagé avec cet utilisateur" },
          { status: 409 }
        )
      }
    }

    if (folderId) {
      const folder = await prisma.gedFolder.findFirst({
        where: { id: folderId, ownerId: session.user.id, isDeleted: false },
      })
      if (!folder) {
        return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
      }

      // Vérifier si le partage existe déjà
      const existingShare = await prisma.gedShare.findFirst({
        where: { folderId, sharedWithId },
      })
      if (existingShare) {
        return NextResponse.json(
          { error: "Ce dossier est déjà partagé avec cet utilisateur" },
          { status: 409 }
        )
      }
    }

    const share = await prisma.gedShare.create({
      data: {
        fileId: fileId || null,
        folderId: folderId || null,
        sharedWithId,
        sharedById: session.user.id,
        canEdit: canEdit || false,
        canDelete: canDelete || false,
        canShare: canShare || false,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        sharedWith: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json({ share }, { status: 201 })
  } catch (error) {
    console.error("[GED_SHARES_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
