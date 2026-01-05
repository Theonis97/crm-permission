import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"

// GET - Récupérer les données de pointage avec filtres
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") // Format: YYYY-MM-DD
    const userId = searchParams.get("userId")
    const period = searchParams.get("period") // "day", "week", "month"

    // Construire les filtres de date
    let startDate: Date
    let endDate: Date

    if (date) {
      startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Par défaut: aujourd'hui
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date()
      endDate.setHours(23, 59, 59, 999)
    }

    // Récupérer tous les utilisateurs avec leurs devices et pointages
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        ...(userId && { id: userId }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        matricule: true,
        status: true,
        attendanceDevices: {
          select: {
            id: true,
            deviceId: true,
            deviceName: true,
            platform: true,
            status: true,
            lastSeenAt: true,
            createdAt: true,
          },
        },
        attendanceLogs: {
          where: {
            timestamp: {
              gte: startDate,
              lte: endDate,
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
          },
        },
      },
      orderBy: {
        firstName: "asc",
      },
    })

    // Calculer les statistiques pour chaque utilisateur
    const usersWithStats = users.map((user) => {
      const logs = user.attendanceLogs
      const checkIn = logs.find((log) => log.type === "CHECK_IN")
      const checkOut = logs.find((log) => log.type === "CHECK_OUT")

      let hoursWorked = 0
      if (checkIn && checkOut) {
        const diff = new Date(checkOut.timestamp).getTime() - new Date(checkIn.timestamp).getTime()
        hoursWorked = diff / (1000 * 60 * 60) // Convertir en heures
      }

      return {
        ...user,
        checkIn: checkIn?.timestamp || null,
        checkOut: checkOut?.timestamp || null,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        hasDevice: user.attendanceDevices.length > 0,
        deviceStatus: user.attendanceDevices[0]?.status || null,
      }
    })

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error("Error fetching attendance data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
