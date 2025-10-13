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

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const store = await prisma.store.findUnique({
      where: { id },
    })

    if (!store) {
      return NextResponse.json({ message: "Magasin introuvable" }, { status: 404 })
    }

    return NextResponse.json(store)
  } catch (error) {
    console.error("Error fetching store:", error)
    return NextResponse.json({ message: "Erreur lors de la récupération du magasin" }, { status: 500 })
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
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const { name, logo, coverImage, address, phone, email, whatsapp, isActive } = body

    // Validation
    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Le nom du magasin est requis" }, { status: 400 })
    }

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json({ message: "Magasin introuvable" }, { status: 404 })
    }

    // Mettre à jour le magasin
    const updatedStore = await prisma.store.update({
      where: { id },
      data: {
        name: name.trim(),
        logo: logo?.trim() || null,
        coverImage: coverImage?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        isActive: isActive ?? existingStore.isActive,
      },
    })

    return NextResponse.json(updatedStore)
  } catch (error) {
    console.error("Error updating store:", error)
    return NextResponse.json({ message: "Erreur lors de la mise à jour du magasin" }, { status: 500 })
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
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    // Vérifier si le magasin existe
    const existingStore = await prisma.store.findUnique({
      where: { id },
    })

    if (!existingStore) {
      return NextResponse.json({ message: "Magasin introuvable" }, { status: 404 })
    }

    // Supprimer le magasin
    await prisma.store.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Magasin supprimé avec succès" })
  } catch (error) {
    console.error("Error deleting store:", error)
    return NextResponse.json({ message: "Erreur lors de la suppression du magasin" }, { status: 500 })
  }
}
