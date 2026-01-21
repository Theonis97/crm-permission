import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer l'historique détaillé d'un employé sur une période
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!userId) {
      return NextResponse.json({ error: "userId est requis" }, { status: 400 })
    }

    // Dates par défaut : 30 derniers jours
    const end = endDate ? new Date(endDate) : new Date()
    end.setHours(23, 59, 59, 999)
    
    const start = startDate ? new Date(startDate) : new Date()
    if (!startDate) {
      start.setDate(start.getDate() - 30)
    }
    start.setHours(0, 0, 0, 0)

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        matricule: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Récupérer tous les logs de pointage pour la période
    const logs = await prisma.attendanceLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
      select: {
        id: true,
        type: true,
        method: true,
        timestamp: true,
        isFlagged: true,
        flagReason: true,
        notes: true,
      },
    })

    // Grouper les logs par jour
    const dailyLogs: Record<string, {
      date: string
      checkIn: Date | null
      checkOut: Date | null
      hours: number
      logs: typeof logs
      isManual: boolean
    }> = {}

    logs.forEach((log) => {
      const dateKey = new Date(log.timestamp).toISOString().split("T")[0]
      
      if (!dailyLogs[dateKey]) {
        dailyLogs[dateKey] = {
          date: dateKey,
          checkIn: null,
          checkOut: null,
          hours: 0,
          logs: [],
          isManual: false,
        }
      }

      dailyLogs[dateKey].logs.push(log)

      if (log.type === "CHECK_IN" && !dailyLogs[dateKey].checkIn) {
        dailyLogs[dateKey].checkIn = log.timestamp
        if (log.method === "MANUAL") {
          dailyLogs[dateKey].isManual = true
        }
      } else if (log.type === "CHECK_OUT") {
        dailyLogs[dateKey].checkOut = log.timestamp
        if (log.method === "MANUAL") {
          dailyLogs[dateKey].isManual = true
        }
      }
    })

    // Calculer les heures travaillées pour chaque jour
    let totalHours = 0
    let daysWorked = 0

    Object.values(dailyLogs).forEach((day) => {
      if (day.checkIn && day.checkOut) {
        const hours = (new Date(day.checkOut).getTime() - new Date(day.checkIn).getTime()) / (1000 * 60 * 60)
        day.hours = Math.round(hours * 100) / 100
        totalHours += day.hours
        daysWorked++
      }
    })

    // Trier les jours par date décroissante
    const sortedDays = Object.values(dailyLogs).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      user,
      period: {
        startDate: start,
        endDate: end,
      },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        daysWorked,
        avgHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
      },
      dailyLogs: sortedDays,
    })
  } catch (error) {
    console.error("Error fetching user attendance history:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
