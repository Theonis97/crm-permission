import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/auth-helpers"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
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

    if (!user || !hasPermission(user, "products.update")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { productId } = await params
    const body = await request.json()
    const { stock, minStock } = body

    // Mettre à jour le StoreProduct
    const updatedStoreProduct = await prisma.storeProduct.update({
      where: { id: productId },
      data: {
        ...(stock !== undefined && { stock }),
        ...(minStock !== undefined && { minStock }),
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

    return NextResponse.json(updatedStoreProduct)
  } catch (error: any) {
    console.error("Error updating store product:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
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

    if (!user || !hasPermission(user, "products.delete")) {
      return NextResponse.json(
        { error: "Permission refusée" },
        { status: 403 }
      )
    }

    const { productId } = await params

    // Supprimer le StoreProduct (cela retire le produit du magasin mais ne supprime pas le produit global)
    await prisma.storeProduct.delete({
      where: { id: productId },
    })

    return NextResponse.json({ message: "Produit retiré du magasin avec succès" })
  } catch (error: any) {
    console.error("Error deleting store product:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    )
  }
}
