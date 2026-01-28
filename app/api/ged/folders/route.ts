import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/ged/folders - Liste des dossiers
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get("parentId")
    const includeShared = searchParams.get("includeShared") === "true"

    // Récupérer les dossiers de l'utilisateur
    const folders = await prisma.gedFolder.findMany({
      where: {
        ownerId: session.user.id,
        parentId: parentId || null,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            children: true,
            files: { where: { isDeleted: false } },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // Si includeShared, récupérer aussi les dossiers partagés avec l'utilisateur
    let sharedFolders: any[] = []
    if (includeShared && !parentId) {
      const shares = await prisma.gedShare.findMany({
        where: {
          sharedWithId: session.user.id,
          folderId: { not: null },
          folder: { isDeleted: false },
        },
        include: {
          folder: {
            include: {
              owner: { select: { id: true, name: true, firstName: true, lastName: true } },
              _count: {
                select: {
                  children: true,
                  files: { where: { isDeleted: false } },
                },
              },
            },
          },
          sharedBy: { select: { id: true, name: true, firstName: true, lastName: true } },
        },
      })
      sharedFolders = shares.map(s => ({
        ...s.folder,
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
      folders,
      sharedFolders,
    })
  } catch (error) {
    console.error("[GED_FOLDERS_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/ged/folders - Créer un dossier
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { name, description, color, icon, parentId } = body

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Le nom du dossier est requis" }, { status: 400 })
    }

    // Vérifier que le dossier parent existe et appartient à l'utilisateur
    if (parentId) {
      const parentFolder = await prisma.gedFolder.findFirst({
        where: {
          id: parentId,
          ownerId: session.user.id,
          isDeleted: false,
        },
      })
      if (!parentFolder) {
        return NextResponse.json({ error: "Dossier parent introuvable" }, { status: 404 })
      }
    }

    // Vérifier qu'un dossier avec le même nom n'existe pas déjà au même niveau
    const existingFolder = await prisma.gedFolder.findFirst({
      where: {
        ownerId: session.user.id,
        parentId: parentId || null,
        name: name.trim(),
        isDeleted: false,
      },
    })

    if (existingFolder) {
      return NextResponse.json(
        { error: "Un dossier avec ce nom existe déjà à cet emplacement" },
        { status: 409 }
      )
    }

    const folder = await prisma.gedFolder.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || null,
        icon: icon || null,
        parentId: parentId || null,
        ownerId: session.user.id,
      },
    })

    return NextResponse.json({ folder }, { status: 201 })
  } catch (error) {
    console.error("[GED_FOLDERS_POST]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
