import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { writeFile } from "fs/promises"
import { join } from "path"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier les permissions
    const canView = await hasPermission(session.user.id, "opportunities.view") || 
                   await hasPermission(session.user.id, "opportunities.view_all")

    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const documents = await prisma.opportunityDocument.findMany({
      where: {
        opportunityId: id,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Erreur lors de la récupération des documents:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier les permissions
    const canCreate = await hasPermission(session.user.id, "opportunities.edit")
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const opportunityId = formData.get("opportunityId") as string

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 })
    }

    // Vérifier que l'opportunité existe
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    // Validation du fichier
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Le fichier est trop volumineux (max 10MB)" }, { status: 400 })
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Type de fichier non autorisé" }, { status: 400 })
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = join(process.cwd(), "uploads", "opportunities", id)
    
    try {
      await writeFile(join(uploadsDir, "test"), "test")
    } catch {
      // Le dossier n'existe pas, on le crée via mkdir -p
      const { exec } = require("child_process")
      await new Promise((resolve, reject) => {
        exec(`mkdir -p "${uploadsDir}"`, (error: any) => {
          if (error) reject(error)
          else resolve(true)
        })
      })
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = `${timestamp}.${extension}`
    const filePath = join(uploadsDir, fileName)

    // Sauvegarder le fichier
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Créer l'enregistrement en base
    const document = await prisma.opportunityDocument.create({
      data: {
        name: file.name,
        url: `/uploads/opportunities/${id}/${fileName}`,
        opportunityId: id,
      },
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de l'upload du document:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
