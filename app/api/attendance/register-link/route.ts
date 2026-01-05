import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"

// Table temporaire pour stocker les liens d'enregistrement
// En production, utiliser Redis ou une table dédiée
const registrationLinks = new Map<string, { userId: string; expiresAt: Date; createdBy: string }>()

// POST - Générer un lien d'enregistrement de device pour un utilisateur
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        attendanceDevices: {
          where: {
            status: { in: ["PENDING", "APPROVED"] },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Vérifier si l'utilisateur a déjà un device actif
    if (user.attendanceDevices.length > 0) {
      return NextResponse.json(
        { error: "L'utilisateur a déjà un appareil enregistré. Révoquez-le d'abord." },
        { status: 400 }
      )
    }

    // Générer un token unique
    const token = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // Expire dans 24h

    // Stocker le lien (en mémoire pour le moment)
    registrationLinks.set(token, {
      userId,
      expiresAt,
      createdBy: session.user.id,
    })

    // Construire l'URL d'enregistrement dynamiquement
    const host = request.headers.get("host") || "localhost:3000"
    const protocol = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https")
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`
    const registerUrl = `${baseUrl}/register-device?token=${token}`

    return NextResponse.json({
      token,
      registerUrl,
      expiresAt,
      user: {
        id: user.id,
        name: user.name || `${user.firstName} ${user.lastName}`,
        email: user.email,
      },
    })
  } catch (error) {
    console.error("Error generating registration link:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// GET - Valider un token d'enregistrement
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const linkData = registrationLinks.get(token)

    if (!linkData) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    }

    if (new Date() > linkData.expiresAt) {
      registrationLinks.delete(token)
      return NextResponse.json({ error: "Token expired" }, { status: 410 })
    }

    // Récupérer les infos de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: linkData.userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        matricule: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      valid: true,
      user,
      expiresAt: linkData.expiresAt,
    })
  } catch (error) {
    console.error("Error validating token:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT - Enregistrer un device avec le token
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, deviceId, deviceName, platform } = body

    if (!token || !deviceId) {
      return NextResponse.json({ error: "token and deviceId are required" }, { status: 400 })
    }

    const linkData = registrationLinks.get(token)

    if (!linkData) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 })
    }

    if (new Date() > linkData.expiresAt) {
      registrationLinks.delete(token)
      return NextResponse.json({ error: "Token expired" }, { status: 410 })
    }

    // Vérifier que l'utilisateur n'a pas déjà un device
    const existingDevice = await prisma.attendanceDevice.findFirst({
      where: {
        userId: linkData.userId,
        status: { in: ["PENDING", "APPROVED"] },
      },
    })

    if (existingDevice) {
      return NextResponse.json(
        { error: "L'utilisateur a déjà un appareil enregistré" },
        { status: 400 }
      )
    }

    // Créer le device
    const device = await prisma.attendanceDevice.create({
      data: {
        userId: linkData.userId,
        deviceId,
        deviceName: deviceName || "Unknown Device",
        platform: platform || "unknown",
        status: "PENDING", // En attente de validation RH
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

    // Supprimer le token utilisé
    registrationLinks.delete(token)

    // Retourner les infos nécessaires pour le pointage automatique
    const userName = device.user.firstName && device.user.lastName 
      ? `${device.user.firstName} ${device.user.lastName}`
      : device.user.email

    return NextResponse.json({
      success: true,
      device,
      userId: device.user.id,
      userName,
      message: "Appareil enregistré avec succès. En attente de validation RH.",
    })
  } catch (error) {
    console.error("Error registering device:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
