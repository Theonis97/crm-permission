import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier les permissions
    const canView = await hasPermission(session.user.id, "opportunities.view") || 
                   await hasPermission(session.user.id, "opportunities.view_all")

    if (!canView) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    // Récupérer les factures liées à l'opportunité
    const invoices = await prisma.invoice.findMany({
      where: {
        Opportunity: {
          some: {
            id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ invoices })
  } catch (error) {
    console.error("Erreur lors de la récupération des factures:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    // Vérifier les permissions
    const canCreate = await hasPermission(session.user.id, "invoices.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Permission refusée" }, { status: 403 })
    }

    const body = await request.json()
    const { title, total, dueDate, contactId } = body

    // Validation
    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Le titre de la facture est obligatoire" }, { status: 400 })
    }

    if (!total || total <= 0) {
      return NextResponse.json({ error: "Le montant total est obligatoire" }, { status: 400 })
    }

    if (!dueDate) {
      return NextResponse.json({ error: "La date d'échéance est obligatoire" }, { status: 400 })
    }

    if (!contactId) {
      return NextResponse.json({ error: "Le contact est obligatoire" }, { status: 400 })
    }

    // Vérifier que l'opportunité existe
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    })

    if (!opportunity) {
      return NextResponse.json({ error: "Opportunité introuvable" }, { status: 404 })
    }

    // Générer un numéro de facture unique
    const lastInvoice = await prisma.invoice.findFirst({
      orderBy: { createdAt: "desc" },
      select: { number: true },
    })

    let nextNumber = 1
    if (lastInvoice?.number) {
      const match = lastInvoice.number.match(/INV-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }

    const invoiceNumber = `INV-${nextNumber.toString().padStart(6, "0")}`

    // Créer la facture
    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        title,
        status: "DRAFT",
        total,
        dueDate: new Date(dueDate),
        contactId,
        userId: session.user.id,
        Opportunity: {
          connect: { id },
        },
      },
    })

    return NextResponse.json({ invoice }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de la facture:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
