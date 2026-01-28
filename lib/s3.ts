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

// ============================================
// FONCTIONS GED (Gestion Électronique de Documents)
// ============================================

// Types MIME autorisés pour le module GED
export const GED_ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/tiff',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Vidéos
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  // Texte
  'text/plain', 'text/csv', 'application/json', 'text/markdown',
  // Archives
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
]

// Limite de taille par fichier (100 MB)
export const GED_MAX_FILE_SIZE = 100 * 1024 * 1024

// Limite de stockage par utilisateur (5 GB)
export const GED_MAX_STORAGE_PER_USER = 5 * 1024 * 1024 * 1024

export interface GedUploadResult {
  success: boolean
  s3Key?: string
  s3Bucket?: string
  fileUrl?: string
  error?: string
}

/**
 * Upload un fichier pour le module GED
 */
export async function uploadGedFile(
  file: File,
  userId: string,
  fileId: string
): Promise<GedUploadResult> {
  try {
    // Générer la clé S3
    const fileExtension = file.name.split(".").pop() || ""
    const s3Key = `ged/users/${userId}/files/${fileId}.${fileExtension}`

    // Convertir le fichier en buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Commande d'upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type || "application/octet-stream",
      ContentLength: buffer.length,
      Metadata: {
        originalName: encodeURIComponent(file.name),
        uploadedAt: new Date().toISOString(),
        userId: userId,
      },
    })

    await s3Client.send(command)

    return {
      success: true,
      s3Key,
      s3Bucket: BUCKET_NAME,
      fileUrl: `/api/files/${s3Key}`,
    }
  } catch (error) {
    console.error("Erreur lors de l'upload GED:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

/**
 * Upload un fichier GED depuis un buffer (pour les uploads via presigned URL)
 */
export async function uploadGedFileFromBuffer(
  buffer: Buffer,
  s3Key: string,
  contentType: string,
  metadata?: Record<string, string>
): Promise<GedUploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
      Metadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata,
      },
    })

    await s3Client.send(command)

    return {
      success: true,
      s3Key,
      s3Bucket: BUCKET_NAME,
      fileUrl: `/api/files/${s3Key}`,
    }
  } catch (error) {
    console.error("Erreur lors de l'upload GED depuis buffer:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

/**
 * Générer une URL présignée pour l'upload direct
 */
export async function getGedUploadPresignedUrl(
  userId: string,
  fileId: string,
  fileName: string,
  contentType: string,
  expiresIn = 3600
): Promise<{ success: boolean; uploadUrl?: string; s3Key?: string; error?: string }> {
  try {
    const fileExtension = fileName.split(".").pop() || ""
    const s3Key = `ged/users/${userId}/files/${fileId}.${fileExtension}`

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

    return {
      success: true,
      uploadUrl,
      s3Key,
    }
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL d'upload:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    }
  }
}

/**
 * Générer une URL présignée pour le téléchargement
 */
export async function getGedDownloadPresignedUrl(
  s3Key: string,
  fileName: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL de téléchargement:", error)
    return null
  }
}

/**
 * Générer une URL présignée pour la prévisualisation (inline)
 */
export async function getGedPreviewPresignedUrl(
  s3Key: string,
  expiresIn = 3600
): Promise<string | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ResponseContentDisposition: "inline",
    })

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn })
    return signedUrl
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL de prévisualisation:", error)
    return null
  }
}

/**
 * Supprimer un fichier GED
 */
export async function deleteGedFile(s3Key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
    })

    await s3Client.send(command)
    return true
  } catch (error) {
    console.error("Erreur lors de la suppression GED:", error)
    return false
  }
}

/**
 * Valider un fichier pour le module GED
 */
export function validateGedFile(file: File): { valid: boolean; error?: string } {
  // Vérifier la taille
  if (file.size > GED_MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `Le fichier ne doit pas dépasser ${GED_MAX_FILE_SIZE / (1024 * 1024)} MB` 
    }
  }

  // Vérifier le type MIME
  if (!GED_ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non autorisé: ${file.type}`,
    }
  }

  return { valid: true }
}

/**
 * Obtenir le type de fichier à partir du MIME type
 */
export function getGedFileType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other' {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType === 'application/pdf' ||
    mimeType.includes('document') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.startsWith('text/')
  ) return 'document'
  if (
    mimeType === 'application/zip' ||
    mimeType.includes('rar') ||
    mimeType.includes('7z')
  ) return 'archive'
  return 'other'
}

/**
 * Formater la taille d'un fichier
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 o'
  const k = 1024
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
