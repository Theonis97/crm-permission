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

    console.log("=== ATTENDANCE API DEBUG ===")
    console.log("Date param:", date)
    console.log("Start date:", startDate.toISOString())
    console.log("End date:", endDate.toISOString())

    // Vérifier d'abord combien de logs existent dans la base
    const allLogs = await prisma.attendanceLog.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: { user: { select: { email: true } } }
    })
    console.log("Total recent logs in DB:", allLogs.length)
    console.log("Recent logs:", allLogs.map(l => ({ 
      email: l.user.email, 
      type: l.type, 
      timestamp: l.timestamp 
    })))

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

    // Debug: afficher les logs trouvés pour chaque utilisateur
    console.log("Users with logs:")
    users.forEach(u => {
      if (u.attendanceLogs.length > 0) {
        console.log(`  - ${u.email}: ${u.attendanceLogs.length} logs`, u.attendanceLogs)
      }
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

      // Priorité: APPROVED > PENDING > REVOKED
      const activeDevice = user.attendanceDevices.find(d => d.status === "APPROVED") 
        || user.attendanceDevices.find(d => d.status === "PENDING")
        || user.attendanceDevices[0]

      return {
        ...user,
        checkIn: checkIn?.timestamp || null,
        checkOut: checkOut?.timestamp || null,
        hoursWorked: Math.round(hoursWorked * 100) / 100,
        hasDevice: user.attendanceDevices.length > 0,
        deviceStatus: activeDevice?.status || null,
      }
    })

    return NextResponse.json(usersWithStats)
  } catch (error) {
    console.error("Error fetching attendance data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
