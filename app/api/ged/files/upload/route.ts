import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { 
  uploadGedFileFromBuffer, 
  GED_ALLOWED_MIME_TYPES, 
  GED_MAX_FILE_SIZE,
  GED_MAX_STORAGE_PER_USER 
} from "@/lib/s3"

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "classertif"

// POST /api/ged/files/upload - Upload d'un fichier
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const folderId = formData.get("folderId") as string | null
    const customName = formData.get("name") as string | null

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Valider le type de fichier
    if (!GED_ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type}` },
        { status: 400 }
      )
    }

    // Valider la taille du fichier
    if (file.size > GED_MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Le fichier ne doit pas dépasser ${GED_MAX_FILE_SIZE / (1024 * 1024)} MB` },
        { status: 400 }
      )
    }

    // Vérifier le quota de stockage de l'utilisateur
    const storageUsed = await prisma.gedFile.aggregate({
      where: {
        ownerId: session.user.id,
        isDeleted: false,
      },
      _sum: { size: true },
    })

    const currentStorage = storageUsed._sum.size || 0
    if (currentStorage + file.size > GED_MAX_STORAGE_PER_USER) {
      return NextResponse.json(
        { error: "Quota de stockage dépassé. Supprimez des fichiers ou augmentez votre espace." },
        { status: 400 }
      )
    }

    // Vérifier que le dossier existe si spécifié
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

    // Générer l'ID du fichier
    const fileId = crypto.randomUUID()
    const fileExtension = file.name.split(".").pop() || ""
    const s3Key = `ged/users/${session.user.id}/files/${fileId}.${fileExtension}`

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload vers S3
    const uploadResult = await uploadGedFileFromBuffer(
      buffer,
      s3Key,
      file.type,
      {
        originalName: encodeURIComponent(file.name),
        userId: session.user.id,
      }
    )

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || "Erreur lors de l'upload" },
        { status: 500 }
      )
    }

    // Créer l'entrée en base de données
    const gedFile = await prisma.gedFile.create({
      data: {
        id: fileId,
        name: customName?.trim() || file.name,
        originalName: file.name,
        s3Key,
        s3Bucket: BUCKET_NAME,
        mimeType: file.type,
        size: file.size,
        extension: fileExtension,
        folderId: folderId || null,
        ownerId: session.user.id,
      },
    })

    return NextResponse.json({ file: gedFile }, { status: 201 })
  } catch (error) {
    console.error("[GED_FILES_UPLOAD]", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
