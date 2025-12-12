import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireApiKey } from "@/lib/api-key-auth"

/**
 * GET /api/ext/categories
 * Lister toutes les catégories de produits
 * Authentification via x-api-key header
 */
export async function GET(request: NextRequest) {
  // Vérifier la clé API
  const authError = requireApiKey(request)
  if (authError) return authError

  try {
    const categories = await prisma.productCategory.findMany({
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    console.log(`✅ [EXT_API] Categories listed: ${categories.length} categories`)

    return NextResponse.json({
      success: true,
      data: categories,
      count: categories.length,
    })
  } catch (error) {
    console.error("❌ [EXT_API] Error fetching categories:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}

/**
 * POST /api/ext/categories
 * Créer une catégorie de produit depuis une application externe
 * Authentification via x-api-key header
 */
export async function POST(request: NextRequest) {
  // Vérifier la clé API
  const authError = requireApiKey(request)
  if (authError) return authError

  try {
    const data = await request.json()
    const { name, description, parentId } = data

    // Validation du nom
    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" }, 
        { status: 400 }
      )
    }

    // Valider le parentId si fourni
    if (parentId && typeof parentId === "string" && parentId.trim() !== "") {
      const parentCategory = await prisma.productCategory.findUnique({
        where: { id: parentId },
      })

      if (!parentCategory) {
        return NextResponse.json(
          { error: "Parent category not found" }, 
          { status: 400 }
        )
      }
    }

    // Créer la catégorie
    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        description: description && typeof description === "string" ? description.trim() : null,
        parentId: parentId && typeof parentId === "string" && parentId.trim() !== "" ? parentId : null,
      },
      include: {
        parent: true,
        subcategories: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    console.log(`✅ [EXT_API] Category created: ${category.id} - ${category.name}`)

    return NextResponse.json({
      success: true,
      data: category,
    }, { status: 201 })

  } catch (error) {
    console.error("❌ [EXT_API] Error creating category:", error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}
