import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"
import { QuoteStatus, InvoiceStatus } from "@/types/sales"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "quotes.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Statistiques des devis
    const [totalQuotes, totalInvoices, paidInvoices, overdueInvoices, acceptedQuotes] = await Promise.all([
      prisma.quote.count(),
      prisma.invoice.count(),
      prisma.invoice.findMany({
        where: { status: InvoiceStatus.PAID },
        select: { total: true },
      }),
      prisma.invoice.findMany({
        where: {
          status: InvoiceStatus.OVERDUE,
          dueDate: { lt: new Date() },
        },
        select: { total: true },
      }),
      prisma.quote.findMany({
        where: { status: QuoteStatus.ACCEPTED },
        select: { total: true },
      }),
    ])

    // Calculs
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.total, 0)
    const pendingAmount = acceptedQuotes.reduce((sum, quote) => sum + quote.total, 0)

    const conversionRate = totalQuotes > 0 ? (acceptedQuotes.length / totalQuotes) * 100 : 0

    const averageQuoteValue =
      totalQuotes > 0 ? (await prisma.quote.aggregate({ _avg: { total: true } }))._avg.total || 0 : 0

    const averageInvoiceValue =
      totalInvoices > 0 ? (await prisma.invoice.aggregate({ _avg: { total: true } }))._avg.total || 0 : 0

    const stats = {
      totalQuotes,
      totalInvoices,
      totalRevenue,
      pendingAmount,
      overdueAmount,
      conversionRate,
      averageQuoteValue,
      averageInvoiceValue,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching sales stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
