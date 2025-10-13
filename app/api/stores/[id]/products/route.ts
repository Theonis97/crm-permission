import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !hasPermission(user, "products.view")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id: storeId } = await params

    // Récupérer les produits du magasin avec leurs informations complètes
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        isActive: true,
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    })

    // Formater les données pour la réponse
    const products = storeProducts.map((sp) => ({
      id: sp.product.id,
      storeProductId: sp.id,
      name: sp.product.name,
      sku: sp.product.sku,
      description: sp.product.description,
      photos: sp.product.photos,
      // Prix spécifiques au magasin ou prix de l'entrepôt par défaut
      prixVente: sp.prixVente ?? sp.product.prixVente,
      prixAchat: sp.prixAchat ?? sp.product.prixAchat,
      tva: sp.product.tva,
      stock: sp.stock,
      minStock: sp.minStock,
      maxStock: sp.maxStock ?? sp.product.maxStock,
      // Prix de l'entrepôt pour comparaison
      warehousePrixVente: sp.product.prixVente,
      warehousePrixAchat: sp.product.prixAchat,
      // Prix spécifiques du magasin (pour l'édition)
      storePrixVente: sp.prixVente,
      storePrixAchat: sp.prixAchat,
      storeMinStock: sp.minStock,
      storeMaxStock: sp.maxStock,
      categoryId: sp.product.categoryId,
      brandId: sp.product.brandId,
      category: {
        id: sp.product.category.id,
        name: sp.product.category.name,
      },
      brand: sp.product.brand
        ? {
            id: sp.product.brand.id,
            name: sp.product.brand.name,
          }
        : null,
      createdAt: sp.product.createdAt,
      updatedAt: sp.product.updatedAt,
    }))

    return NextResponse.json(products)
  } catch (error) {
    console.error("Error fetching store products:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!user || !hasPermission(user, "products.create")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { id: storeId } = await params
    const body = await request.json()
    const { productId, stock, minStock } = body

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable" }, { status: 404 })
    }

    // Vérifier si le produit n'est pas déjà dans le magasin
    const existing = await prisma.storeProduct.findFirst({
      where: {
        storeId,
        productId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ce produit existe déjà dans le magasin" },
        { status: 400 }
      )
    }

    // Créer le StoreProduct
    const storeProduct = await prisma.storeProduct.create({
      data: {
        storeId,
        productId,
        stock: stock || 0,
        minStock: minStock || 0,
      },
      include: {
        product: {
          include: {
            category: true,
            brand: true,
          },
        },
      },
    })

    return NextResponse.json(storeProduct, { status: 201 })
  } catch (error) {
    console.error("Error adding product to store:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'ajout du produit" },
      { status: 500 }
    )
  }
}
