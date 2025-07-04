import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ContactType, ContactStatus } from "@/types/contacts"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const type = searchParams.get("type") as ContactType | null
    const status = searchParams.get("status") as ContactStatus | null
    const assignedUserId = searchParams.get("assignedUserId")

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { job: { contains: search, mode: "insensitive" } },
      ]
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (assignedUserId) {
      where.assignedUserId = assignedUserId
    }

    const contacts = await prisma.contact.findMany({
      where,
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Erreur lors de la récupération des contacts:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, photo, job, description, tags, assignedUserId, type, status } = body

    // Validation basique
    if (!assignedUserId) {
      return NextResponse.json({ error: "L'utilisateur assigné est requis" }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: {
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        phone: phone || null,
        photo: photo || null,
        job: job || null,
        description: description || null,
        tags: tags || [],
        assignedUserId,
        type: type || "PERSONNE",
        status: status || "PROSPECT",
      },
      include: {
        assignedUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création du contact:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
