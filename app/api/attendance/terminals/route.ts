import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedSession } from "@/lib/auth-helpers"
import crypto from "crypto"

// GET - Liste des terminaux
export async function GET() {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const terminals = await prisma.attendanceTerminal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            qrTokens: true,
            logs: true,
          },
        },
      },
    })

    return NextResponse.json(terminals)
  } catch (error) {
    console.error("Error fetching terminals:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST - Créer un terminal
export async function POST(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { name, location, type } = body

    if (!name) {
      return NextResponse.json(
        { error: "Le nom du terminal est requis" },
        { status: 400 }
      )
    }

    // Générer un code unique pour le terminal
    const code = `TERM_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    
    // Générer une clé secrète pour signer les QR codes
    const secretKey = crypto.randomBytes(32).toString("hex")

    const terminal = await prisma.attendanceTerminal.create({
      data: {
        code,
        name,
        location: location || null,
        type: type || "ENTRY_EXIT",
        status: "ACTIVE",
        secretKey,
      },
    })

    return NextResponse.json(terminal, { status: 201 })
  } catch (error) {
    console.error("Error creating terminal:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE - Supprimer un terminal
export async function DELETE(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const { searchParams } = new URL(request.url)
    const terminalId = searchParams.get("id")

    if (!terminalId) {
      return NextResponse.json(
        { error: "ID du terminal requis" },
        { status: 400 }
      )
    }

    await prisma.attendanceTerminal.delete({
      where: { id: terminalId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting terminal:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PATCH - Mettre à jour le statut d'un terminal
export async function PATCH(request: Request) {
  try {
    const { session, error } = await getAuthenticatedSession()
    if (error) return error

    const body = await request.json()
    const { terminalId, action, name, location, type } = body

    if (!terminalId) {
      return NextResponse.json(
        { error: "ID du terminal requis" },
        { status: 400 }
      )
    }

    let updateData: any = {}

    if (action === "activate") {
      updateData.status = "ACTIVE"
    } else if (action === "deactivate") {
      updateData.status = "INACTIVE"
    } else if (action === "maintenance") {
      updateData.status = "MAINTENANCE"
    } else if (action === "update") {
      if (name) updateData.name = name
      if (location !== undefined) updateData.location = location
      if (type) updateData.type = type
    } else if (action === "regenerate_code") {
      updateData.code = `TERM_${Date.now().toString(36).toUpperCase()}_${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    }

    const terminal = await prisma.attendanceTerminal.update({
      where: { id: terminalId },
      data: updateData,
    })

    return NextResponse.json(terminal)
  } catch (error) {
    console.error("Error updating terminal:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
