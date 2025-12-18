import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Liste des produits d'un magasin avec stock
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    const { storeId } = await params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const barcode = searchParams.get("barcode") || ""

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Magasin introuvable" },
        { status: 404 }
      )
    }

    // Construire les conditions de recherche sur le produit
    const productWhereConditions: any = {}

    // Recherche par code-barres
    if (barcode) {
      productWhereConditions.sku = barcode
    }
    // Recherche par nom
    else if (search) {
      productWhereConditions.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ]
    }

    // Récupérer les produits via StoreProduct
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        isActive: true,
        product: productWhereConditions,
      },
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
            variants: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
                prixVente: true,
                stock: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    })

    // URL de base pour les images
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

    // Fonction pour construire l'URL complète de l'image
    const getFullImageUrl = (imagePath: string | null | undefined): string | null => {
      if (!imagePath) return null
      // Si c'est déjà une URL complète, la retourner telle quelle
      if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
        return imagePath
      }
      // Sinon, préfixer avec l'URL de base
      return `${baseUrl}${imagePath.startsWith("/") ? "" : "/"}${imagePath}`
    }

    // Formater les produits pour l'affichage
    const formattedProducts = storeProducts.map((sp) => ({
      id: sp.product.id,
      name: sp.product.name,
      price: sp.prixVente || sp.product.prixVente,
      compareAtPrice: sp.product.prixVente,
      barcode: sp.product.sku,
      sku: sp.product.sku,
      stock: sp.stock,
      lowStock: sp.stock <= (sp.minStock || 5),
      outOfStock: sp.stock <= 0,
      image: getFullImageUrl(sp.product.photos?.[0]),
      category: sp.product.category?.name || null,
      brand: sp.product.brand?.name || null,
      hasVariants: sp.product.variants.length > 0,
      variants: sp.product.variants.map((v) => ({
        id: v.id,
        name: v.name,
        price: v.prixVente,
        stock: v.stock,
        barcode: v.sku,
        sku: v.sku,
      })),
    }))

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      total: formattedProducts.length,
    })
  } catch (error) {
    console.error("[SUB_BOX_PRODUCTS_GET]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}
