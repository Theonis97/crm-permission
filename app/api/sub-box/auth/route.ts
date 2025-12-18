import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST - Authentification d'une sous-caisse via son code
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { success: false, error: "Le code est requis" },
        { status: 400 }
      )
    }

    // Rechercher la sous-caisse par son code (insensible à la casse)
    const subBox = await prisma.subBox.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
      },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
      },
    })

    if (!subBox) {
      return NextResponse.json(
        { success: false, error: "Code invalide ou sous-caisse inactive" },
        { status: 401 }
      )
    }

    // Générer un token de session simple (timestamp + subBoxId encodé)
    const sessionToken = Buffer.from(
      JSON.stringify({
        subBoxId: subBox.id,
        storeId: subBox.storeId,
        code: subBox.code,
        createdAt: Date.now(),
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 heures
      })
    ).toString("base64")

    return NextResponse.json({
      success: true,
      data: {
        token: sessionToken,
        subBox: {
          id: subBox.id,
          name: subBox.name,
          code: subBox.code,
        },
        store: subBox.store,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      },
    })
  } catch (error) {
    console.error("[SUB_BOX_AUTH]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'authentification" },
      { status: 500 }
    )
  }
}

// GET - Vérifier la validité d'une session
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Token manquant" },
        { status: 401 }
      )
    }

    const token = authHeader.replace("Bearer ", "")

    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"))
      
      // Vérifier l'expiration
      if (Date.now() > decoded.expiresAt) {
        return NextResponse.json(
          { success: false, error: "Session expirée" },
          { status: 401 }
        )
      }

      // Vérifier que la sous-caisse existe toujours et est active
      const subBox = await prisma.subBox.findFirst({
        where: {
          id: decoded.subBoxId,
          isActive: true,
        },
        include: {
          store: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
            },
          },
        },
      })

      if (!subBox) {
        return NextResponse.json(
          { success: false, error: "Sous-caisse invalide ou désactivée" },
          { status: 401 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          subBox: {
            id: subBox.id,
            name: subBox.name,
            code: subBox.code,
          },
          store: subBox.store,
          expiresAt: decoded.expiresAt,
        },
      })
    } catch {
      return NextResponse.json(
        { success: false, error: "Token invalide" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("[SUB_BOX_AUTH_VERIFY]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la vérification" },
      { status: 500 }
    )
  }
}
