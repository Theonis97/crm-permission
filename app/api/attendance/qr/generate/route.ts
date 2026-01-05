import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "crypto"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "attendance-qr-secret"

export async function GET(request: Request) {
  try {
    // Vérifier l'authentification du terminal via le header Authorization
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    
    let terminalData: { terminalId: string }
    try {
      terminalData = jwt.verify(token, JWT_SECRET) as { terminalId: string }
    } catch {
      return NextResponse.json({ error: "Token invalide" }, { status: 401 })
    }

    // Vérifier que le terminal existe et est actif
    const terminal = await prisma.attendanceTerminal.findUnique({
      where: { id: terminalData.terminalId },
    })

    if (!terminal || terminal.status !== "ACTIVE") {
      return NextResponse.json({ error: "Terminal non autorisé" }, { status: 403 })
    }

    // Générer un QR code unique avec expiration
    const qrPayload = {
      terminalId: terminal.id,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString("hex"),
    }

    // Créer un token JWT pour le QR code (expire dans 30 secondes)
    const qrToken = jwt.sign(qrPayload, JWT_SECRET, { expiresIn: "30s" })

    // Stocker le token dans la base de données
    const expiresAt = new Date(Date.now() + 30 * 1000)
    
    await prisma.attendanceQRToken.create({
      data: {
        token: qrToken,
        terminalId: terminal.id,
        expiresAt,
      },
    })

    // Mettre à jour le updatedAt du terminal (heartbeat implicite)
    await prisma.attendanceTerminal.update({
      where: { id: terminal.id },
      data: { updatedAt: new Date() },
    })

    return NextResponse.json({
      qrCode: qrToken,
      expiresAt: expiresAt.toISOString(),
      terminalId: terminal.id,
    })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
