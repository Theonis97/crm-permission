import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"

// GET /api/ged/folders/[id] - Détails d'un dossier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params

    const folder = await prisma.gedFolder.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [
          { ownerId: session.user.id },
          { shares: { some: { sharedWithId: session.user.id } } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, firstName: true, lastName: true } },
        parent: { select: { id: true, name: true } },
        children: {
          where: { isDeleted: false },
          orderBy: { name: "asc" },
          include: {
            _count: {
              select: {
                children: true,
                files: { where: { isDeleted: false } },
              },
            },
          },
        },
        files: {
          where: { isDeleted: false },
          orderBy: { name: "asc" },
        },
        shares: {
          include: {
            sharedWith: { select: { id: true, name: true, firstName: true, lastName: true, email: true } },
          },
        },
        _count: {
          select: {
            children: true,
            files: { where: { isDeleted: false } },
          },
        },
      },
    })

    if (!folder) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
    }

    // Construire le chemin (breadcrumb)
    const breadcrumb = await buildBreadcrumb(folder.id)

    return NextResponse.json({ folder, breadcrumb })
  } catch (error) {
    console.error("[GED_FOLDER_GET]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PUT /api/ged/folders/[id] - Modifier un dossier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { id } = await params
    const body = await request.json()
    const { name, description, color, icon, parentId } = body

    // Vérifier que le dossier existe et appartient à l'utilisateur
    const folder = await prisma.gedFolder.findFirst({
      where: {
        id,
        ownerId: session.user.id,
        isDeleted: false,
      },
    })

    if (!folder) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
    }

    // Si on change le parent, vérifier qu'il existe
    if (parentId !== undefined && parentId !== folder.parentId) {
      if (parentId) {
        // Vérifier que le nouveau parent existe
        const newParent = await prisma.gedFolder.findFirst({
          where: {
            id: parentId,
            ownerId: session.user.id,
            isDeleted: false,
          },
        })
        if (!newParent) {
          return NextResponse.json({ error: "Dossier parent introuvable" }, { status: 404 })
        }
        // Vérifier qu'on ne déplace pas un dossier dans un de ses enfants
        if (await isDescendant(id, parentId)) {
          return NextResponse.json(
            { error: "Impossible de déplacer un dossier dans un de ses sous-dossiers" },
            { status: 400 }
          )
        }
      }
    }

    // Vérifier l'unicité du nom si modifié
    if (name && name.trim() !== folder.name) {
      const targetParentId = parentId !== undefined ? parentId : folder.parentId
      const existingFolder = await prisma.gedFolder.findFirst({
        where: {
          ownerId: session.user.id,
          parentId: targetParentId,
          name: name.trim(),
          isDeleted: false,
          id: { not: id },
        },
      })
      if (existingFolder) {
        return NextResponse.json(
          { error: "Un dossier avec ce nom existe déjà à cet emplacement" },
          { status: 409 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (color !== undefined) updateData.color = color || null
    if (icon !== undefined) updateData.icon = icon || null
    if (parentId !== undefined) updateData.parentId = parentId || null

    const updatedFolder = await prisma.gedFolder.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ folder: updatedFolder })
  } catch (error) {
    console.error("[GED_FOLDER_PUT]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/ged/folders/[id] - Supprimer un dossier (soft delete)
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

    // Vérifier que le dossier existe et appartient à l'utilisateur
    const folder = await prisma.gedFolder.findFirst({
      where: {
        id,
        ownerId: session.user.id,
      },
    })

    if (!folder) {
      return NextResponse.json({ error: "Dossier introuvable" }, { status: 404 })
    }

    if (permanent) {
      // Suppression définitive - supprimer aussi les fichiers S3
      // TODO: Supprimer les fichiers S3 associés
      await prisma.gedFolder.delete({ where: { id } })
      return NextResponse.json({ success: true, message: "Dossier supprimé définitivement" })
    } else {
      // Soft delete
      await prisma.gedFolder.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
      // Marquer aussi les sous-dossiers et fichiers comme supprimés
      await markDescendantsAsDeleted(id)
      return NextResponse.json({ success: true, message: "Dossier déplacé vers la corbeille" })
    }
  } catch (error) {
    console.error("[GED_FOLDER_DELETE]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// Fonction utilitaire pour construire le breadcrumb
async function buildBreadcrumb(folderId: string): Promise<{ id: string; name: string }[]> {
  const breadcrumb: { id: string; name: string }[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const folderData: { id: string; name: string; parentId: string | null } | null = await prisma.gedFolder.findUnique({
      where: { id: currentId },
      select: { id: true, name: true, parentId: true },
    })
    if (!folderData) break
    breadcrumb.unshift({ id: folderData.id, name: folderData.name })
    currentId = folderData.parentId
  }

  return breadcrumb
}

// Fonction utilitaire pour vérifier si un dossier est descendant d'un autre
async function isDescendant(parentId: string, potentialDescendantId: string): Promise<boolean> {
  let currentId: string | null = potentialDescendantId

  while (currentId) {
    if (currentId === parentId) return true
    const folderData: { parentId: string | null } | null = await prisma.gedFolder.findUnique({
      where: { id: currentId },
      select: { parentId: true },
    })
    if (!folderData) break
    currentId = folderData.parentId
  }

  return false
}

// Fonction utilitaire pour marquer les descendants comme supprimés
async function markDescendantsAsDeleted(folderId: string): Promise<void> {
  const now = new Date()

  // Marquer les fichiers du dossier comme supprimés
  await prisma.gedFile.updateMany({
    where: { folderId, isDeleted: false },
    data: { isDeleted: true, deletedAt: now },
  })

  // Récupérer les sous-dossiers
  const subFolders = await prisma.gedFolder.findMany({
    where: { parentId: folderId, isDeleted: false },
    select: { id: true },
  })

  // Marquer les sous-dossiers comme supprimés et récurser
  for (const subFolder of subFolders) {
    await prisma.gedFolder.update({
      where: { id: subFolder.id },
      data: { isDeleted: true, deletedAt: now },
    })
    await markDescendantsAsDeleted(subFolder.id)
  }
}
