import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

// Configuration MinIO S3
export const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  region: process.env.MINIO_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
  forcePathStyle: true, // Important pour MinIO
})

const BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "classertif"

export interface UploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  error?: string
}

export async function uploadFileToS3(file: File, folder = "stores"): Promise<UploadResult> {
  try {
    // Générer un nom de fichier unique
    const fileExtension = file.name.split(".").pop()
    const fileName = `${folder}/${uuidv4()}.${fileExtension}` 

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Déterminer le type MIME
    const contentType = file.type || "application/octet-stream"

    // Commande d'upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
      Metadata: {
        originalName: encodeURIComponent(file.name),
        uploadedAt: new Date().toISOString(),
      },
    })

    await s3Client.send(command)

    // Au lieu de construire l'URL directe, on utilise notre API
    const fileUrl = `/api/files/${fileName}` 

    return {
      success: true,
      fileUrl,
      fileName,
    }
  } catch (error) {
    console.error("Erreur lors de l'upload S3:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

export async function deleteFileFromS3(fileName: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error("Erreur lors de la suppression S3:", error)
    return false
  }
}

// Fonction pour générer une URL signée (sécurisée)
export async function getSignedFileUrl(fileName: string, expiresIn = 3600): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL signée:", error)
    return null
  }
}

// Fonction pour récupérer un fichier depuis S3
export async function getFileFromS3(
  fileName: string,
): Promise<{ success: boolean; data?: Buffer; contentType?: string; error?: string }> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
    })

    const response = await s3Client.send(command)

    if (!response.Body) {
      return { success: false, error: "Fichier non trouvé" }
    }

    // Convertir le stream en buffer
    const chunks: Uint8Array[] = []
    const reader = response.Body.transformToWebStream().getReader()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const buffer = Buffer.concat(chunks)

    return {
      success: true,
      data: buffer,
      contentType: response.ContentType || "application/octet-stream",
    }
  } catch (error) {
    console.error("Erreur lors de la récupération du fichier S3:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

// Fonction utilitaire pour valider les fichiers
export function validateFile(file: File, type: "image" | "video" | "document" | "any" = "any"): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024 // 50MB
  const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif", "image/svg+xml"]
  const allowedVideoTypes = ["video/mp4", "video/mov", "video/avi", "video/webm"]
  const allowedDocTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ]

  if (file.size > maxSize) {
    return { valid: false, error: "Le fichier ne doit pas dépasser 50MB" }
  }

  let allowedTypes: string[] = []
  
  switch (type) {
    case "image":
      allowedTypes = allowedImageTypes
      break
    case "video":
      allowedTypes = allowedVideoTypes
      break
    case "document":
      allowedTypes = allowedDocTypes
      break
    case "any":
      allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedDocTypes]
      break
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé. Formats acceptés: ${allowedTypes.join(", ")}`,
    }
  }

  return { valid: true }
}
