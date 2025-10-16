import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les contacts d'une boutique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Récupérer tous les StoreContact pour ce magasin
    const storeContacts = await prisma.storeContact.findMany({
      where: {
        storeId,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photo: true,
            status: true,
            type: true,
          },
        },
      },
      orderBy: {
        totalOrders: "desc",
      },
    })

    // Retourner les StoreContact complets (pour compatibilité avec la page contacts)
    return NextResponse.json(storeContacts)
  } catch (error: any) {
    console.error("Error fetching store contacts:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des contacts" },
      { status: 500 }
    )
  }
}

// POST - Créer un contact et l'associer à la boutique
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { firstName, lastName, phone, email, type, status } = body

    // Validation
    if (!phone) {
      return NextResponse.json(
        { error: "Le téléphone est requis" },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier si un contact avec ce téléphone existe déjà
    let contact = await prisma.contact.findFirst({
      where: {
        phone,
      },
    })

    if (contact) {
      // Le contact existe déjà, vérifier s'il est déjà associé à cette boutique
      const existingStoreContact = await prisma.storeContact.findUnique({
        where: {
          storeId_contactId: {
            storeId,
            contactId: contact.id,
          },
        },
      })

      if (existingStoreContact) {
        // Déjà associé, retourner le contact
        return NextResponse.json(contact)
      }

      // Associer le contact existant à la boutique
      await prisma.storeContact.create({
        data: {
          storeId,
          contactId: contact.id,
        },
      })

      return NextResponse.json(contact)
    }

    // Créer le nouveau contact ET l'associer à la boutique
    contact = await prisma.contact.create({
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
        phone,
        email: email || null,
        type: type || "PERSONNE",
        status: status || "CLIENT",
        assignedUserId: user.id,
        storeContacts: {
          create: {
            storeId,
          },
        },
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error: any) {
    console.error("Error creating store contact:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création du contact" },
      { status: 500 }
    )
  }
}
