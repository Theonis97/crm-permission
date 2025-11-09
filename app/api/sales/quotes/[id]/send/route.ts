import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        contact: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 })
    }

    // TODO: Intégrer un service d'envoi d'email (SendGrid, Resend, etc.)
    // Pour l'instant, on simule l'envoi
    console.log(`📧 Envoi du devis ${quote.number} à ${quote.contact.email}`)

    // Mettre à jour le statut et la date d'envoi
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Devis envoyé à ${quote.contact.email}`,
      quote: updatedQuote,
    })
  } catch (error) {
    console.error("Error sending quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi du devis" },
      { status: 500 }
    )
  }
}
