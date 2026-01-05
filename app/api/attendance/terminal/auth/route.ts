import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "attendance-qr-secret"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { terminalCode } = body

    if (!terminalCode) {
      return NextResponse.json(
        { error: "Code du terminal requis" },
        { status: 400 }
      )
    }

    // Rechercher le terminal par son code
    const terminal = await prisma.attendanceTerminal.findUnique({
      where: { code: terminalCode },
    })

    if (!terminal) {
      return NextResponse.json(
        { error: "Terminal non trouvé" },
        { status: 404 }
      )
    }

    if (terminal.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Terminal inactif ou en maintenance" },
        { status: 403 }
      )
    }

    // Générer un token JWT pour le terminal
    const token = jwt.sign(
      { terminalId: terminal.id, code: terminal.code },
      JWT_SECRET,
      { expiresIn: "30d" }
    )

    return NextResponse.json({
      token,
      terminal: {
        id: terminal.id,
        name: terminal.name,
        location: terminal.location || "",
      },
    })
  } catch (error) {
    console.error("Error authenticating terminal:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
