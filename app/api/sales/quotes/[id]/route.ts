import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
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
        contact: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            job: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 })
    }

    return NextResponse.json(quote)
  } catch (error) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du devis" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await params
    
    // Vérifier que le devis existe
    const quote = await prisma.quote.findUnique({
      where: { id },
      select: { number: true }
    })

    if (!quote) {
      return NextResponse.json({ error: "Devis non trouvé" }, { status: 404 })
    }

    // Supprimer le devis (cascade supprime aussi les items)
    await prisma.quote.delete({
      where: { id }
    })

    console.log(`🗑️ Devis ${quote.number} supprimé`)

    return NextResponse.json({
      success: true,
      message: `Devis ${quote.number} supprimé avec succès`
    })
  } catch (error) {
    console.error("Error deleting quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression du devis" },
      { status: 500 }
    )
  }
}
