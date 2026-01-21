import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// POST - Créer une entrée manuelle de pointage
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { userId, date, checkInTime, checkOutTime, notes } = body

    if (!userId || !date) {
      return NextResponse.json(
        { error: "userId et date sont requis" },
        { status: 400 }
      )
    }

    if (!checkInTime && !checkOutTime) {
      return NextResponse.json(
        { error: "Au moins une heure (arrivée ou départ) est requise" },
        { status: 400 }
      )
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    const targetDate = new Date(date)
    const createdLogs = []

    // Supprimer les anciens logs manuels pour cette date si on en crée de nouveaux
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    // Supprimer les entrées existantes pour cette date (seulement les manuelles)
    await prisma.attendanceLog.deleteMany({
      where: {
        userId,
        method: "MANUAL",
        timestamp: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
    })

    // Créer l'entrée CHECK_IN si fournie
    if (checkInTime) {
      const [hours, minutes] = checkInTime.split(":").map(Number)
      const checkInDate = new Date(targetDate)
      checkInDate.setHours(hours, minutes, 0, 0)

      const checkInLog = await prisma.attendanceLog.create({
        data: {
          userId,
          type: "CHECK_IN",
          method: "MANUAL",
          timestamp: checkInDate,
          notes: notes || `Saisie manuelle par ${session?.user?.name || session?.user?.email}`,
          isFlagged: false,
        },
      })
      createdLogs.push(checkInLog)
    }

    // Créer l'entrée CHECK_OUT si fournie
    if (checkOutTime) {
      const [hours, minutes] = checkOutTime.split(":").map(Number)
      const checkOutDate = new Date(targetDate)
      checkOutDate.setHours(hours, minutes, 0, 0)

      const checkOutLog = await prisma.attendanceLog.create({
        data: {
          userId,
          type: "CHECK_OUT",
          method: "MANUAL",
          timestamp: checkOutDate,
          notes: notes || `Saisie manuelle par ${session?.user?.name || session?.user?.email}`,
          isFlagged: false,
        },
      })
      createdLogs.push(checkOutLog)
    }

    return NextResponse.json({
      success: true,
      message: "Pointage manuel enregistré avec succès",
      logs: createdLogs,
    })
  } catch (error) {
    console.error("Error creating manual attendance entry:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du pointage manuel" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer une entrée de pointage
export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const logId = searchParams.get("logId")

    if (!logId) {
      return NextResponse.json(
        { error: "logId est requis" },
        { status: 400 }
      )
    }

    // Vérifier que le log existe
    const log = await prisma.attendanceLog.findUnique({
      where: { id: logId },
    })

    if (!log) {
      return NextResponse.json(
        { error: "Entrée de pointage non trouvée" },
        { status: 404 }
      )
    }

    // Supprimer le log
    await prisma.attendanceLog.delete({
      where: { id: logId },
    })

    return NextResponse.json({
      success: true,
      message: "Entrée de pointage supprimée avec succès",
    })
  } catch (error) {
    console.error("Error deleting attendance entry:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
