import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/warehouse/return-requests
 * Lister toutes les demandes de retour magasin → entrepôt (pour le gestionnaire entrepôt)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get("status") || "PENDING"
    const storeId = searchParams.get("storeId")

    const returnRequests = await prisma.storeReturnRequest.findMany({
      where: {
        ...(status !== "all" ? { status: status as any } : {}),
        ...(storeId ? { storeId } : {}),
      },
      include: {
        store: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
                stock: true,
              },
            },
          },
        },
        requestedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        validatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: returnRequests })
  } catch (error) {
    console.error("[WAREHOUSE_RETURN_REQUESTS_GET]", error)
    return NextResponse.json({ error: "Erreur lors du chargement" }, { status: 500 })
  }
}
