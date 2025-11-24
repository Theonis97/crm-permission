import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

// POST /api/stores/[id]/users/[userId]/reset-password - Réinitialiser le mot de passe d'un utilisateur
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: storeId, userId } = await params

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId }
    })

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 })
    }

    // Vérifier que l'utilisateur existe et est assigné à ce magasin
    const storeUserRole = await prisma.storeUserRole.findFirst({
      where: {
        userId,
        storeId
      },
      include: {
        user: true
      }
    })

    if (!storeUserRole) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé dans ce magasin" },
        { status: 404 }
      )
    }

    // Hasher le nouveau mot de passe par défaut
    const hashedPassword = await bcrypt.hash("password", 12)

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword
      }
    })

    return NextResponse.json({ 
      message: "Mot de passe réinitialisé avec succès",
      newPassword: "password"
    })
  } catch (error) {
    console.error("Error resetting user password:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
