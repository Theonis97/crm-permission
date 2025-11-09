import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    console.log("🔄 Récupération des devis...")

    // Récupérer les devis depuis la base de données
    const quotes = await prisma.quote.findMany({
      include: {
        contact: {
          select: {
            id: true,
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
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`✅ ${quotes.length} devis récupérés`)

    // Formater les données pour le frontend
    const formattedQuotes = quotes.map(quote => ({
      id: quote.id,
      number: quote.number,
      status: quote.status,
      customerName: `${quote.contact.firstName} ${quote.contact.lastName}`,
      customerEmail: quote.contact.email,
      amount: quote.total,
      createdAt: quote.createdAt.toISOString(),
      validUntil: quote.validUntil.toISOString(),
    }))

    return NextResponse.json(formattedQuotes)
  } catch (error) {
    console.error("❌ Error fetching quotes:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des devis" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    console.log("📝 Création d'un devis:", body)

    // Créer le devis dans la base de données
    const newQuote = await prisma.quote.create({
      data: {
        number: body.number,
        contactId: body.contactId,
        userId: session.user.id,
        status: body.status || 'DRAFT',
        title: `Devis ${body.number}`,
        description: body.notes || null,
        subtotal: body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0),
        totalDiscount: body.items.reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice * item.discount) / 100), 0),
        totalTax: 0,
        total: body.amount,
        validUntil: new Date(body.validUntil),
        notes: body.notes || null,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId || null,
            name: item.description,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discount: item.discount,
            taxRate: 0,
            total: item.total,
            type: 'SERVICE',
          })),
        },
      },
      include: {
        contact: true,
        items: true,
      },
    })

    console.log("✅ Devis créé:", newQuote.id)

    return NextResponse.json(newQuote, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating quote:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du devis" },
      { status: 500 }
    )
  }
}
