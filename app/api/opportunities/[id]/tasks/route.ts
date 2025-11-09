import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

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

    const tasks = await prisma.task.findMany({
      where: {
        opportunityId: id,
      },
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ tasks })
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error)
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
    const canCreate = await hasPermission(session.user.id, "tasks.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, userId, dueDate } = body

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: "Le titre est obligatoire" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "L'utilisateur assigné est obligatoire" }, { status: 400 })
    }

    // Vérifier que l'opportunité existe
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    // Créer la tâche
    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        userId,
        opportunityId: id,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: "TODO",
      },
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
    })

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
