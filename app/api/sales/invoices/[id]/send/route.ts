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
    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return NextResponse.json({ error: "Facture non trouvée" }, { status: 404 })
    }

    // TODO: Intégrer un service d'envoi d'email (SendGrid, Resend, etc.)
    // Pour l'instant, on simule l'envoi
    console.log(`📧 Envoi de la facture ${invoice.number} à ${invoice.contact.email}`)

    // Mettre à jour le statut et la date d'envoi
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Facture envoyée à ${invoice.contact.email}`,
      invoice: updatedInvoice,
    })
  } catch (error) {
    console.error("Error sending invoice:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de la facture" },
      { status: 500 }
    )
  }
}
