import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskStatus } from "@/types/tasks"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const userId = searchParams.get("userId")
    const opportunityId = searchParams.get("opportunityId")
    const search = searchParams.get("search")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const where: any = {}

    if (status) {
      where.status = { in: status.split(",") }
    }

    if (userId) {
      where.userId = { in: userId.split(",") }
    }

    if (opportunityId) {
      where.opportunityId = opportunityId
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          opportunity: {
            select: { id: true, title: true },
          },
        },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.task.count({ where }),
    ])

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error("Erreur lors de la récupération des tâches:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération des tâches" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, isImportant, userId, opportunityId, startDate, dueDate } = body

    if (!title) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }

    // Utiliser l'utilisateur connecté par défaut si aucun userId n'est fourni
    const assignedUserId = userId && userId !== "defaultUserId" ? userId : session.user.id

    // Vérifier que l'utilisateur assigné existe
    const userExists = await prisma.user.findUnique({
      where: { id: assignedUserId },
    })

    if (!userExists) {
      return NextResponse.json({ error: "L'utilisateur assigné n'existe pas" }, { status: 400 })
    }

    // Vérifier que l'opportunité existe si fournie
    if (opportunityId && opportunityId !== "noOpportunity") {
      const opportunityExists = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
      })

      if (!opportunityExists) {
        return NextResponse.json({ error: "L'opportunité spécifiée n'existe pas" }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || TaskStatus.TODO,
        isImportant: isImportant || false,
        userId: assignedUserId,
        opportunityId: opportunityId && opportunityId !== "noOpportunity" ? opportunityId : null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        opportunity: {
          select: { id: true, title: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error)
    return NextResponse.json({ error: "Erreur lors de la création de la tâche" }, { status: 500 })
  }
}
