import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiKey } from "@/lib/api-key-auth"

/**
 * POST /api/ext/products
 * Créer un produit depuis une application externe
 * Authentification via x-api-key header
 */
export async function POST(request: NextRequest) {
  // Vérifier la clé API
  const authError = requireApiKey(request)
  if (authError) return authError

  try {
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

    // Validation des champs requis
    if (!name || prixVente === undefined || prixAchat === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: name, prixVente, prixAchat are required" }, 
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category is required" }, 
        { status: 400 }
      )
    }

    // Vérifier que la catégorie existe
    const categoryExists = await prisma.productCategory.findUnique({
      where: { id: categoryId },
    })

    if (!categoryExists) {
      return NextResponse.json(
        { error: "Category not found" }, 
        { status: 400 }
      )
    }

    // Vérifier que la marque existe si fournie
    if (brandId) {
      const brandExists = await prisma.brand.findUnique({
        where: { id: brandId },
      })

      if (!brandExists) {
        return NextResponse.json(
          { error: "Brand not found" }, 
          { status: 400 }
        )
      }
    }

    // Créer le produit
    const product = await prisma.product.create({
      data: {
        name,
        sku: sku || null,
        description: description || null,
        photos: photos || [],
        prixVente: Number(prixVente),
        prixAchat: Number(prixAchat),
        tva: Number(tva) || 20,
        stock: Number(stock) || 0,
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

    // Note: Pas de mouvement de stock créé car userId est requis
    // Le stock initial est directement défini sur le produit

    console.log(`✅ [EXT_API] Product created: ${product.id} - ${product.name}`)

    return NextResponse.json({
      success: true,
      data: product,
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [EXT_API] Error creating product:", error)
    
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "SKU already exists" }, 
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}
