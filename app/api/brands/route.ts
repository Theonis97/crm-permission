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

    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(brands)
  } catch (error) {
    console.error("Error fetching brands:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canCreate = await hasGlobalOrStorePermission(session.user.id, "products.create", "store.products.create")
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()
    const { name, description, logo, website } = data

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Vérifier si la marque existe déjà
    const existingBrand = await prisma.brand.findUnique({
      where: { name: name.trim() },
    })

    if (existingBrand) {
      return NextResponse.json({ error: "Brand already exists" }, { status: 400 })
    }

    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        description: description && typeof description === "string" ? description.trim() : null,
        logo: logo && typeof logo === "string" ? logo.trim() : null,
        website: website && typeof website === "string" ? website.trim() : null,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    return NextResponse.json(brand, { status: 201 })
  } catch (error) {
    console.error("Error creating brand:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
