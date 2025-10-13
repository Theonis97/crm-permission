import { NextRequest, NextResponse } from "next/server"
import { getFileFromS3 } from "@/lib/s3"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Route pour servir les fichiers depuis S3/MinIO
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params
    const fileName = path.join("/")

    if (!fileName) {
      return NextResponse.json({ message: "Nom de fichier manquant" }, { status: 400 })
    }

    // Récupérer le fichier depuis S3
    const result = await getFileFromS3(fileName)

    if (!result.success || !result.data) {
      return NextResponse.json({ message: result.error || "Fichier non trouvé" }, { status: 404 })
    }

    // Retourner le fichier avec le bon Content-Type
    return new NextResponse(result.data, {
      headers: {
        "Content-Type": result.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ message: "Erreur lors de la récupération du fichier" }, { status: 500 })
  }
}
