import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params

    // Récupérer tous les StoreContact pour ce magasin
    const storeContacts = await prisma.storeContact.findMany({
      where: {
        storeId,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photo: true,
            status: true,
          },
        },
      },
      orderBy: {
        totalOrders: "desc",
      },
    })

    return NextResponse.json(storeContacts)
  } catch (error: any) {
    console.error("Error fetching store contacts:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des contacts" },
      { status: 500 }
    )
  }
}
