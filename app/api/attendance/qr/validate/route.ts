import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "attendance-qr-secret"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { qrToken, deviceId, userId } = body

    if (!qrToken || !deviceId || !userId) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      )
    }

    // Vérifier et décoder le token QR
    let qrPayload: { terminalId: string; timestamp: number; nonce: string }
    try {
      qrPayload = jwt.verify(qrToken, JWT_SECRET) as typeof qrPayload
    } catch {
      return NextResponse.json(
        { error: "QR code invalide ou expiré" },
        { status: 400 }
      )
    }

    // Vérifier que le token existe en base et n'a pas été utilisé
    const storedToken = await prisma.attendanceQRToken.findUnique({
      where: { token: qrToken },
    })

    if (!storedToken) {
      return NextResponse.json(
        { error: "QR code non reconnu" },
        { status: 400 }
      )
    }

    if (storedToken.usedAt) {
      return NextResponse.json(
        { error: "QR code déjà utilisé" },
        { status: 400 }
      )
    }

    if (new Date() > storedToken.expiresAt) {
      return NextResponse.json(
        { error: "QR code expiré" },
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

    // Vérifier si l'appareil est approuvé pour cet utilisateur
    // Si pas d'appareil approuvé, on permet quand même le pointage via web
    let device = await prisma.attendanceDevice.findFirst({
      where: {
        userId,
        deviceId,
        status: "APPROVED",
      },
    })

    // Si pas d'appareil trouvé, créer un appareil web temporaire ou utiliser un existant
    if (!device) {
      // Chercher un appareil web existant pour cet utilisateur
      device = await prisma.attendanceDevice.findFirst({
        where: {
          userId,
          platform: "web",
          status: "APPROVED",
        },
      })

      // Si toujours pas d'appareil, créer un appareil web auto-approuvé
      if (!device) {
        device = await prisma.attendanceDevice.create({
          data: {
            userId,
            deviceId: `WEB_${userId}_${Date.now()}`,
            deviceName: "Navigateur Web",
            platform: "web",
            status: "APPROVED",
          },
        })
      }
    }

    // Déterminer le type de pointage (entrée ou sortie)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const lastLog = await prisma.attendanceLog.findFirst({
      where: {
        userId,
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { timestamp: "desc" },
    })

    const attendanceType = !lastLog || lastLog.type === "CHECK_OUT" ? "CHECK_IN" : "CHECK_OUT"

    // Créer le log de pointage
    const attendanceLog = await prisma.attendanceLog.create({
      data: {
        userId,
        terminalId: qrPayload.terminalId,
        type: attendanceType,
        method: "QR_CODE",
        timestamp: new Date(),
        deviceId: device.id,
      },
    })

    // Marquer le token comme utilisé
    await prisma.attendanceQRToken.update({
      where: { id: storedToken.id },
      data: {
        usedAt: new Date(),
        usedBy: userId,
      },
    })

    // Mettre à jour lastSeenAt de l'appareil
    await prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })

    return NextResponse.json({
      success: true,
      type: attendanceType,
      timestamp: attendanceLog.timestamp,
      message: attendanceType === "CHECK_IN" ? "Arrivée enregistrée" : "Départ enregistré",
    })
  } catch (error) {
    console.error("Error validating QR code:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
