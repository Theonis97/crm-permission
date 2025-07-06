import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canViewAll = await hasPermission(session.user.id, "opportunities.view_all")
    const canView = await hasPermission(session.user.id, "opportunities.view")

    if (!canView && !canViewAll) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const {id} = await params

    const where: any = { id: id }

    // Si l'utilisateur ne peut pas voir toutes les opportunités
    if (!canViewAll) {
      where.OR = [
        { ownerId: session.user.id },
        {
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
      ]
    }

    const opportunity = await prisma.opportunity.findFirst({
      where,
      include: {
        contact: {
          include: {
            assignedUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        documents: true,
        tasks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        invoices: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            invoices: true,
            documents: true,
          },
        },
      },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Erreur lors de la récupération de l'opportunité:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération de l'opportunité" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canEdit = await hasPermission(session.user.id, "opportunities.edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const {id} = await params


    const body = await request.json()
    const { title, description, status, contactId, participantIds = [] } = body

    // Vérifier que l'opportunité existe et que l'utilisateur peut la modifier
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id: id,
        OR: [
          { ownerId: session.user.id },
          {
            participants: {
              some: {
                userId: session.user.id,
              },
            },
          },
        ],
      },
    })

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    // Mettre à jour l'opportunité
    const opportunity = await prisma.opportunity.update({
      where: { id: id },
      data: {
        title: title?.trim(),
        description: description?.trim() || null,
        status,
        contactId,
        participants: participantIds
          ? {
              deleteMany: {},
              create: participantIds
                .filter((id: string) => id !== existingOpportunity.ownerId)
                .map((userId: string) => ({
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
                name: true,
                email: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
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

    return NextResponse.json({ opportunity })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'opportunité:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'opportunité" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, "opportunities.delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const {id} = await params


    // Vérifier que l'opportunité existe et que l'utilisateur peut la supprimer
    const existingOpportunity = await prisma.opportunity.findFirst({
      where: {
        id: id,
        ownerId: session.user.id, // Seul le propriétaire peut supprimer
      },
    })

    if (!existingOpportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    await prisma.opportunity.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'opportunité:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de l'opportunité" }, { status: 500 })
  }
}
