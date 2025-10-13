import { type NextRequest, NextResponse } from "next/server"
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, "products.view")
    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Error fetching brand:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, "products.update")
    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const data = await request.json()
    const { name, description, logo, website, isActive } = data

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Vérifier si la marque existe
    const existingBrand = await prisma.brand.findUnique({
      where: { id },
    })

    if (!existingBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    // Vérifier si le nouveau nom est déjà utilisé par une autre marque
    if (name.trim() !== existingBrand.name) {
      const brandWithSameName = await prisma.brand.findUnique({
        where: { name: name.trim() },
      })

      if (brandWithSameName && brandWithSameName.id !== id) {
        return NextResponse.json(
          { error: "Brand name already exists" },
          { status: 400 }
        )
      }
    }

    const brand = await prisma.brand.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description && typeof description === "string" ? description.trim() : null,
        logo: logo && typeof logo === "string" ? logo.trim() : null,
        website: website && typeof website === "string" ? website.trim() : null,
        isActive: typeof isActive === "boolean" ? isActive : existingBrand.isActive,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.error("Error updating brand:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const canDelete = await hasPermission(session.user.id, "products.delete")
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Vérifier si la marque existe
    const brand = await prisma.brand.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 })
    }

    // Vérifier si la marque a des produits
    if (brand._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete brand with ${brand._count.products} product(s). Please reassign or delete products first.` },
        { status: 400 }
      )
    }

    await prisma.brand.delete({
      where: { id },
    })

    return NextResponse.json({ message: "Brand deleted successfully" })
  } catch (error) {
    console.error("Error deleting brand:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
