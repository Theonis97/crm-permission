import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "products.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const categoryId = searchParams.get("categoryId")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const inStock = searchParams.get("inStock")

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    if (minPrice || maxPrice) {
      where.prixVente = {}
      if (minPrice) where.prixVente.gte = Number(minPrice)
      if (maxPrice) where.prixVente.lte = Number(maxPrice)
    }

    if (inStock === "true") {
      where.stock = { gt: 0 }
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canCreate = await hasPermission(session.user.id, "products.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, photos, prixVente, prixAchat, tva, stock, categoryId } = data

    if (!name || prixVente === undefined || prixAchat === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        photos: photos || [],
        prixVente: Number(prixVente),
        prixAchat: Number(prixAchat),
        tva: Number(tva) || 20,
        stock: Number(stock) || 0,
        categoryId: categoryId || null,
      },
      include: {
        category: true,
      },
    })

    // Créer un mouvement de stock initial si stock > 0
    if (stock > 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: Number(stock),
          type: "ENTRY",
          note: "Stock initial",
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
