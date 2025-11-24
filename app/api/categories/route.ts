import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasGlobalOrStorePermission } from "@/lib/auth-helpers"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasGlobalOrStorePermission(session.user.id, "products.view", "store.products.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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

    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Session user ID:", session.user.id)

    const canCreate = await hasGlobalOrStorePermission(session.user.id, "products.create", "store.products.create")
    console.log("Can create products:", canCreate)

    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, parentId } = data

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Valider le parentId si fourni
    if (parentId && typeof parentId === "string" && parentId.trim() !== "") {
      const parentCategory = await prisma.productCategory.findUnique({
        where: { id: parentId },
      })

      if (!parentCategory) {
        return NextResponse.json({ error: "Parent category not found" }, { status: 400 })
      }
    }

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

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)

    // Gestion spécifique des erreurs Prisma
    if (error) {
      return NextResponse.json({ error: "Invalid parent category" }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
