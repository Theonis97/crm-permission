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

    console.log("🔄 Récupération des factures...")

    // Récupérer les factures depuis la base de données
    const invoices = await prisma.invoice.findMany({
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

    console.log(`✅ ${invoices.length} factures récupérées`)

    // Formater les données pour le frontend
    const formattedInvoices = invoices.map(invoice => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      customerName: `${invoice.contact.firstName} ${invoice.contact.lastName}`,
      customerEmail: invoice.contact.email,
      amount: invoice.total,
      createdAt: invoice.createdAt.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
    }))

    return NextResponse.json(formattedInvoices)
  } catch (error) {
    console.error("❌ Error fetching invoices:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des factures" },
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
    console.log("📝 Création d'une facture:", body)

    // Calculer les totaux
    const subtotal = body.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
    const totalDiscount = body.items.reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice * item.discount) / 100), 0)
    const totalHT = subtotal - totalDiscount
    const totalTax = totalHT * 0.18 // TVA 18%

    // Créer la facture dans la base de données
    const newInvoice = await prisma.invoice.create({
      data: {
        number: body.number,
        contactId: body.contactId,
        userId: session.user.id,
        status: body.status || 'DRAFT',
        title: `Facture ${body.number}`,
        description: body.notes || null,
        subtotal: subtotal,
        totalDiscount: totalDiscount,
        totalTax: totalTax,
        total: body.amount,
        dueDate: new Date(body.dueDate),
        notes: body.notes || null,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: {
        contact: true,
        items: true,
      },
    })

    console.log("✅ Facture créée:", newInvoice.id)

    return NextResponse.json(newInvoice, { status: 201 })
  } catch (error) {
    console.error("❌ Error creating invoice:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la facture" },
      { status: 500 }
    )
  }
}
