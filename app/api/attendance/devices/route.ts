import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// GET - Récupérer tous les devices
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")

    const whereClause: any = {}
    if (userId) whereClause.userId = userId
    if (status) whereClause.status = status

    const devices = await prisma.attendanceDevice.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
            email: true,
            matricule: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(devices)
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST - Approuver ou révoquer un device
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { deviceId, action } = body // action: "approve" | "revoke"

    if (!deviceId || !action) {
      return NextResponse.json({ error: "deviceId and action are required" }, { status: 400 })
    }

    const device = await prisma.attendanceDevice.findUnique({
      where: { id: deviceId },
    })

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    let updatedDevice

    if (action === "approve") {
      updatedDevice = await prisma.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          status: "APPROVED",
          approvedBy: session.user.id,
          approvedAt: new Date(),
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
    } else if (action === "revoke") {
      updatedDevice = await prisma.attendanceDevice.update({
        where: { id: deviceId },
        data: {
          status: "REVOKED",
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
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json(updatedDevice)
  } catch (error) {
    console.error("Error updating device:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE - Supprimer un device
export async function DELETE(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")

    if (!deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
    }

    await prisma.attendanceDevice.delete({
      where: { id: deviceId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting device:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
