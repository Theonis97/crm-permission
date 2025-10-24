import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { PushNotificationService } from "@/lib/push-notifications"

// POST - Enregistrer un token push
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deliveryPersonId, token, deviceId, platform } = body

    if (!deliveryPersonId || !token) {
      return NextResponse.json(
        { error: "deliveryPersonId et token sont requis" },
        { status: 400 }
      )
    }

    // Vérifier que le livreur existe
    const deliveryPerson = await prisma.deliveryPerson.findUnique({
      where: { id: deliveryPersonId },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { error: "Livreur non trouvé" },
        { status: 404 }
      )
    }

    // Enregistrer le token
    await PushNotificationService.registerPushToken(
      deliveryPersonId,
      token,
      deviceId,
      platform
    )

    return NextResponse.json({
      success: true,
      message: "Token push enregistré avec succès",
    })
  } catch (error: any) {
    console.error("Erreur enregistrement token push:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'enregistrement du token" },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un token push
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: "Token requis" },
        { status: 400 }
      )
    }

    await PushNotificationService.unregisterPushToken(token)

    return NextResponse.json({
      success: true,
      message: "Token push supprimé avec succès",
    })
  } catch (error: any) {
    console.error("Erreur suppression token push:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression du token" },
      { status: 500 }
    )
  }
}
