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
    const category = await prisma.productCategory.findUnique({
      where: { id:id },
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

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canEdit = await hasPermission(session.user.id, "products.edit")
    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, parentId } = data

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }


    const {id} = await params

    // Vérifier que la catégorie existe
    const existingCategory = await prisma.productCategory.findUnique({
      where: { id: id },
    })

    if (!existingCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Valider le parentId si fourni
    if (parentId && typeof parentId === "string" && parentId.trim() !== "") {
      // Empêcher qu'une catégorie soit son propre parent
      if (parentId === id) {
        return NextResponse.json({ error: "A category cannot be its own parent" }, { status: 400 })
      }

      const parentCategory = await prisma.productCategory.findUnique({
        where: { id: parentId },
      })

      if (!parentCategory) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 })
      }

      // Vérifier qu'on ne crée pas une boucle (parent -> enfant -> parent)
      const checkForLoop = async (categoryId: string, targetParentId: string): Promise<boolean> => {
        const category = await prisma.productCategory.findUnique({
          where: { id: categoryId },
          include: { subcategories: true },
        })

        if (!category) return false

        for (const subcategory of category.subcategories) {
          if (subcategory.id === targetParentId) return true
          if (await checkForLoop(subcategory.id, targetParentId)) return true
        }

        return false
      }

      if (await checkForLoop(id, parentId)) {
        return NextResponse.json({ error: "This would create a circular reference" }, { status: 400 })
      }
    }

    const category = await prisma.productCategory.update({
      where: { id: id },
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

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error updating category:", error)

    if (error) {
      return NextResponse.json({ error: "Invalid parent category" }, { status: 400 })
    }

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
    // Vérifier que la catégorie existe
    const category = await prisma.productCategory.findUnique({
      where: { id: id },
      include: {
        subcategories: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    // Empêcher la suppression si la catégorie a des produits
    if (category._count.products > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category._count.products} products. Move or delete products first.`,
        },
        { status: 400 },
      )
    }

    // Empêcher la suppression si la catégorie a des sous-catégories
    if (category.subcategories.length > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category with ${category.subcategories.length} subcategories. Delete subcategories first.`,
        },
        { status: 400 },
      )
    }

    await prisma.productCategory.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: "Category deleted successfully" })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
