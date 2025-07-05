import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { InvoiceStatus } from "@/types/sales"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "invoices.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const status = searchParams.get("status")
    const contactId = searchParams.get("contactId")

    const where: any = {}

    if (search) {
      where.OR = [
        { number: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ]
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (contactId) {
      where.contactId = contactId
    }

    // Mettre à jour les factures en retard
    await prisma.invoice.updateMany({
      where: {
        status: InvoiceStatus.SENT,
        dueDate: { lt: new Date() },
      },
      data: {
        status: InvoiceStatus.OVERDUE,
      },
    })

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        quote: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                prixVente: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(invoices)
  } catch (error) {
    console.error("Error fetching invoices:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canCreate = await hasPermission(session.user.id, "invoices.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const {
      contactId,
      quoteId,
      title,
      description,
      dueDate,
      notes,
      terms,
      items,
      subtotal,
      totalDiscount,
      totalTax,
      total,
    } = data

    if (!contactId || !title || !dueDate || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Générer un numéro de facture unique
    const currentYear = new Date().getFullYear()
    const lastInvoice = await prisma.invoice.findFirst({
      where: {
        number: {
          startsWith: `FAC-${currentYear}-`,
        },
      },
      orderBy: { number: "desc" },
    })

    let nextNumber = 1
    if (lastInvoice) {
      const lastNumber = Number.parseInt(lastInvoice.number.split("-")[2])
      nextNumber = lastNumber + 1
    }

    const invoiceNumber = `FAC-${currentYear}-${nextNumber.toString().padStart(4, "0")}`

    const invoice = await prisma.invoice.create({
      data: {
        number: invoiceNumber,
        contactId,
        quoteId: quoteId || null,
        title,
        description,
        status: InvoiceStatus.DRAFT,
        subtotal: Number(subtotal),
        totalDiscount: Number(totalDiscount),
        totalTax: Number(totalTax),
        total: Number(total),
        dueDate: new Date(dueDate),
        notes,
        terms,
        userId: session.user.id,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId || null,
            name: item.name,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            discount: Number(item.discount),
            taxRate: Number(item.taxRate),
            total:
              Number(item.quantity) *
              Number(item.unitPrice) *
              (1 - Number(item.discount) / 100) *
              (1 + Number(item.taxRate) / 100),
            type: item.type,
          })),
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            job: true,
            phone: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        quote: {
          select: {
            id: true,
            number: true,
            title: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                prixVente: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
