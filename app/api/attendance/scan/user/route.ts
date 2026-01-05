import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST - Authentifier un utilisateur pour le pointage
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        name: true,
        matricule: true,
        password: true,
        status: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      )
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Compte désactivé" },
        { status: 403 }
      )
    }

    // Vérifier le mot de passe
    if (!user.password) {
      return NextResponse.json(
        { error: "Compte sans mot de passe" },
        { status: 401 }
      )
    }
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Identifiants incorrects" },
        { status: 401 }
      )
    }

    // Retourner les infos utilisateur (sans le mot de passe)
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
      matricule: user.matricule,
    })
  } catch (error) {
    console.error("Error authenticating user for scan:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
