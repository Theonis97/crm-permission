import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "products.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [totalProducts, totalCategories, products] = await Promise.all([
      prisma.product.count(),
      prisma.productCategory.count(),
      prisma.product.findMany({
        select: {
          stock: true,
          prixAchat: true,
        },
      }),
    ])

    const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock < 10).length
    const outOfStockProducts = products.filter((p) => p.stock === 0).length
    const totalValue = products.reduce((sum, p) => sum + p.prixAchat * p.stock, 0)

    return NextResponse.json({
      totalProducts,
      totalCategories,
      lowStockProducts,
      outOfStockProducts,
      totalValue,
    })
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
