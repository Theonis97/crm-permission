import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les statistiques de pointage (semaine/mois)
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const period = searchParams.get("period") || "week" // "week" ou "month"

    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date()
    endDate.setHours(23, 59, 59, 999)

    if (period === "week") {
      // Début de la semaine (lundi)
      startDate = new Date(now)
      const day = startDate.getDay()
      const diff = startDate.getDate() - day + (day === 0 ? -6 : 1)
      startDate.setDate(diff)
      startDate.setHours(0, 0, 0, 0)
    } else {
      // Début du mois
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      startDate.setHours(0, 0, 0, 0)
    }

    // Récupérer les pointages pour la période
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    }

    if (userId) {
      whereClause.userId = userId
    }

    const logs = await prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: [
        { userId: "asc" },
        { timestamp: "asc" },
      ],
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            matricule: true,
          },
        },
      },
    })

    // Grouper par utilisateur et par jour
    const userStats: Record<string, {
      user: any
      totalHours: number
      daysWorked: number
      avgHoursPerDay: number
      dailyLogs: Record<string, { checkIn: Date | null; checkOut: Date | null; hours: number }>
    }> = {}

    logs.forEach((log) => {
      const dateKey = new Date(log.timestamp).toISOString().split("T")[0]
      
      if (!userStats[log.userId]) {
        userStats[log.userId] = {
          user: log.user,
          totalHours: 0,
          daysWorked: 0,
          avgHoursPerDay: 0,
          dailyLogs: {},
        }
      }

      if (!userStats[log.userId].dailyLogs[dateKey]) {
        userStats[log.userId].dailyLogs[dateKey] = {
          checkIn: null,
          checkOut: null,
          hours: 0,
        }
      }

      if (log.type === "CHECK_IN" && !userStats[log.userId].dailyLogs[dateKey].checkIn) {
        userStats[log.userId].dailyLogs[dateKey].checkIn = log.timestamp
      } else if (log.type === "CHECK_OUT") {
        userStats[log.userId].dailyLogs[dateKey].checkOut = log.timestamp
      }
    })

    // Calculer les heures travaillées
    Object.values(userStats).forEach((stat) => {
      let totalHours = 0
      let daysWorked = 0

      Object.values(stat.dailyLogs).forEach((day) => {
        if (day.checkIn && day.checkOut) {
          const hours = (new Date(day.checkOut).getTime() - new Date(day.checkIn).getTime()) / (1000 * 60 * 60)
          day.hours = Math.round(hours * 100) / 100
          totalHours += day.hours
          daysWorked++
        }
      })

      stat.totalHours = Math.round(totalHours * 100) / 100
      stat.daysWorked = daysWorked
      stat.avgHoursPerDay = daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0
    })

    // Calculer les statistiques globales
    const allStats = Object.values(userStats)
    const totalUsers = allStats.length
    const avgHoursAll = totalUsers > 0 
      ? Math.round((allStats.reduce((sum, s) => sum + s.totalHours, 0) / totalUsers) * 100) / 100 
      : 0

    // Heures attendues (8h par jour, 5 jours par semaine)
    const expectedHoursPerDay = 8
    const workDaysInPeriod = period === "week" ? 5 : 22 // Approximation pour le mois
    const expectedTotalHours = expectedHoursPerDay * workDaysInPeriod

    return NextResponse.json({
      period,
      startDate,
      endDate,
      expectedHoursPerDay,
      expectedTotalHours,
      totalUsers,
      avgHoursAll,
      userStats: allStats,
    })
  } catch (error) {
    console.error("Error fetching attendance stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
