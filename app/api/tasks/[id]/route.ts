import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const {id} = await params
    const task = await prisma.task.findUnique({
      where: { id: id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        opportunity: {
          select: { id: true, title: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    console.error("Erreur lors de la récupération de la tâche:", error)
    return NextResponse.json({ error: "Erreur lors de la récupération de la tâche" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, status, userId, opportunityId, startDate, dueDate } = body
    const {id} = await params

    // Vérifier que la tâche existe
    const existingTask = await prisma.task.findUnique({
      where: { id: id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
    }

    // Vérifier que l'utilisateur assigné existe si fourni
    if (userId) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!userExists) {
        return NextResponse.json({ error: "L'utilisateur assigné n'existe pas" }, { status: 400 })
      }
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

    const task = await prisma.task.update({
      where: { id: id },
      data: {
        title: title || existingTask.title,
        description: description !== undefined ? description : existingTask.description,
        status: status || existingTask.status,
        userId: userId || existingTask.userId,
        opportunityId: opportunityId === "noOpportunity" ? null : opportunityId || existingTask.opportunityId,
        startDate: startDate ? new Date(startDate) : existingTask.startDate,
        dueDate: dueDate ? new Date(dueDate) : existingTask.dueDate,
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

    return NextResponse.json(task)
  } catch (error) {
    console.error("Erreur lors de la mise à jour de la tâche:", error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour de la tâche" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const {id} = await params

    // Vérifier que la tâche existe
    const existingTask = await prisma.task.findUnique({
      where: { id: id },
    })

    if (!existingTask) {
      return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: "Tâche supprimée avec succès" })
  } catch (error) {
    console.error("Erreur lors de la suppression de la tâche:", error)
    return NextResponse.json({ error: "Erreur lors de la suppression de la tâche" }, { status: 500 })
  }
}
