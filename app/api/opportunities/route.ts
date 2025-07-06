import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { OpportunityStatus } from "@/types/opportunities"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as OpportunityStatus | null

    const canView = await hasPermission(session.user.id, "opportunities.view")


    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const where: any = {}

    if (status) {
      where.status = status
    }

    const canCreate = await hasPermission(session.user.id, "opportunities.create")


    // il ne voit que les siennes et celles où il est participant
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    where.OR = [{ ownerId: session.user.id }, { participants: { some: { userId: session.user.id } } }]

    const opportunities = await prisma.opportunity.findMany({
      where,
      include: {
        contact: {
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
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        documents: true,
        _count: {
          select: {
            tasks: true,
            invoices: true,
            documents: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ opportunities })
  } catch (error) {
    console.error("Erreur lors de la récupération des opportunités:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions
    const canCreate = await hasPermission(session.user.id, "opportunities.create")


    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, contactId, participantIds } = body

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 })
    }

    if (!contactId) {
      return NextResponse.json({ error: "Le contact est obligatoire" }, { status: 400 })
    }

    // Vérifier que le contact existe
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
    })

    if (!contact) {
      return NextResponse.json({ error: "Contact introuvable" }, { status: 404 })
    }

    // Créer l'opportunité
    const opportunity = await prisma.opportunity.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        contactId,
        ownerId: session.user.id,
        status: "NEW",
        participants:
          participantIds?.length > 0
            ? {
                create: participantIds.map((userId: string) => ({
                  userId,
                })),
              }
            : undefined,
      },
      include: {
        contact: {
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
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        documents: true,
        _count: {
          select: {
            tasks: true,
            invoices: true,
            documents: true,
          },
        },
      },
    })

    return NextResponse.json({ opportunity }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de l'opportunité:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}
