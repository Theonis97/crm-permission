import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer un magasin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    console.log("[STORE_GET] Fetching store with ID:", id)

    if (!session?.user) {
      console.log("[STORE_GET] No authenticated user")
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    if (!store) {
      console.log("[STORE_GET] Store not found for ID:", id)
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    console.log("[STORE_GET] Store found:", store.name)
    return NextResponse.json(store)
  } catch (error) {
    console.error("[STORE_GET] Error fetching store:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération du magasin" }, { status: 500 })
  }
}

// PUT - Mettre à jour un magasin
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const { name, logo, coverImage, address, phone, email, whatsapp, isActive, managerId } = body

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Validation du nom seulement s'il est fourni
    if (name !== undefined && (!name || name.trim() === "")) {
      return NextResponse.json({ error: "Le nom du magasin est requis" }, { status: 400 })
    }

    // Préparer les données à mettre à jour (seulement les champs fournis)
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name.trim()
    if (logo !== undefined) updateData.logo = logo?.trim() || null
    if (coverImage !== undefined) updateData.coverImage = coverImage?.trim() || null
    if (address !== undefined) updateData.address = address?.trim() || null
    if (phone !== undefined) updateData.phone = phone?.trim() || null
    if (email !== undefined) updateData.email = email?.trim() || null
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp?.trim() || null
    if (isActive !== undefined) updateData.isActive = isActive
    if (managerId !== undefined) updateData.managerId = managerId

    // Mettre à jour le magasin
    const updatedStore = await prisma.store.update({
      where: { id },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedStore)
  } catch (error) {
    console.error("Error updating store:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour du magasin" }, { status: 500 })
  }
}

// DELETE - Supprimer un magasin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json({ error: "Magasin introuvable" }, { status: 404 })
    }

    // Supprimer le magasin
    await prisma.store.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Magasin supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting store:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression du magasin" }, { status: 500 })
  }
}
