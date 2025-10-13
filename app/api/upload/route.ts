import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { uploadFileToS3, validateFile } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const folder = formData.get("folder") as string || "uploads"
    const fileType = formData.get("type") as "image" | "video" | "document" | "any" || "any"

    if (!file) {
      return NextResponse.json({ message: "Aucun fichier fourni" }, { status: 400 })
    }

    // Validation du fichier
    const validation = validateFile(file, fileType)
    if (!validation.valid) {
      return NextResponse.json({ message: validation.error }, { status: 400 })
    }

    // Upload vers S3/MinIO
    const result = await uploadFileToS3(file, folder)

    if (!result.success) {
      return NextResponse.json({ message: result.error || "Erreur lors de l'upload" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      fileUrl: result.fileUrl,
      fileName: result.fileName,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { message: "Erreur lors de l'upload du fichier" },
      { status: 500 }
    )
  }
}
