import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "products.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const {id} = await params

    const product = await prisma.product.findUnique({
      where: { id: id },
      include: {
        category: true,
        brand: true,
        stockMovements: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params:Promise<{ id: string }>}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canEdit = await hasPermission(session.user.id, "products.edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const {id} = await params


    const data = await request.json()
    const { 
      name, 
      sku,
      description, 
      photos, 
      prixVente, 
      prixAchat, 
      tva, 
      stock,
      minStock,
      maxStock,
      categoryId,
      brandId 
    } = data

    if (!name || prixVente === undefined || prixAchat === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    // Récupérer l'ancien stock pour calculer la différence
    const currentProduct = await prisma.product.findUnique({
      where: { id: id },
    })

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const product = await prisma.product.update({
      where: { id: id },
      data: {
        name,
        sku: sku || null,
        description: description || null,
        photos: photos || [],
        prixVente: Number(prixVente),
        prixAchat: Number(prixAchat),
        tva: Number(tva) || 20,
        stock: Number(stock),
        minStock: Number(minStock) || 0,
        maxStock: maxStock ? Number(maxStock) : null,
        categoryId,
        brandId: brandId || null,
      },
      include: {
        category: true,
        brand: true,
      },
    })

    // Créer un mouvement de stock si le stock a changé
    const stockDifference = Number(stock) - currentProduct.stock
    if (stockDifference !== 0) {
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          quantity: stockDifference,
          type: "ADJUSTMENT",
          note: `Ajustement de stock (${currentProduct.stock} → ${stock})`,
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(product)
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, "products.delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const {id} = await params


    const product = await prisma.product.findUnique({
      where: { id: id },
    })

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    // Supprimer les mouvements de stock associés
    await prisma.stockMovement.deleteMany({
      where: { productId: id },
    })

    // Supprimer le produit
    await prisma.product.delete({
      where: { id: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
