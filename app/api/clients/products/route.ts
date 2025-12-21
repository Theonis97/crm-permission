import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const storeId = searchParams.get("storeId")

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      )
    }

    // Récupérer les produits du magasin qui sont actifs
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

    // Récupérer l'URL de base pour les images
    const protocol = request.headers.get("x-forwarded-proto") || "http"
    const host = request.headers.get("host") || "localhost:3000"
    const baseUrl = `${protocol}://${host}`

    // Formater les données pour le client (sans info de stock sensible, juste la disponibilité)
    const products = storeProducts.map((sp) => {
      let imageUrl = null
      if (sp.product.photos && sp.product.photos.length > 0) {
        const photoPath = sp.product.photos[0]
        // Si c'est déjà une URL complète (http...), on la garde
        // Sinon, on construit l'URL via notre proxy S3
        if (photoPath.startsWith("http")) {
          imageUrl = photoPath
        } else {
          // On retire le slash initial s'il existe
          let cleanPath = photoPath.startsWith("/") ? photoPath.substring(1) : photoPath
          
          // Si le chemin commence déjà par "api/files/", on ne l'ajoute pas à nouveau
          if (cleanPath.startsWith("api/files/")) {
             imageUrl = `${baseUrl}/${cleanPath}`
          } else {
             imageUrl = `${baseUrl}/api/files/${cleanPath}`
          }
        }
      }

      return {
        id: sp.product.id,
        name: sp.product.name,
        price: sp.prixVente ?? sp.product.prixVente,
        image: imageUrl,
        category: sp.product.category.name,
        sku: sp.product.sku,
        stock: sp.stock, // On garde le stock pour savoir si rupture ou pas coté client
        outOfStock: sp.stock <= 0,
        brand: sp.product.brand?.name,
        description: sp.product.description
      }
    })

    return NextResponse.json({
        success: true,
        data: products
    })

  } catch (error) {
    console.error("Error fetching client products:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des produits" },
      { status: 500 }
    )
  }
}
