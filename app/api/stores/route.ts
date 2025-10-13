import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Liste tous les magasins
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const stores = await prisma.store.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(stores)
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json({ message: "Erreur lors de la récupération des magasins" }, { status: 500 })
  }
}

// POST - Créer un nouveau magasin
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 })
    }

    const body = await req.json()
    const { name, logo, coverImage, address, phone, email, whatsapp, managerId } = body

    // Validation
    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Le nom du magasin est requis" }, { status: 400 })
    }

    // Créer le magasin
    const store = await prisma.store.create({
      data: {
        name: name.trim(),
        logo: logo?.trim() || null,
        coverImage: coverImage?.trim() || null,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        managerId: managerId || null,
      },
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

    return NextResponse.json(store, { status: 201 })
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json({ message: "Erreur lors de la création du magasin" }, { status: 500 })
  }
}
