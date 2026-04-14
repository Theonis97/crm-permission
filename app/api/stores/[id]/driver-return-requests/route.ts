import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/stores/[id]/driver-return-requests
 * Liste les demandes de retour livreur pour un magasin donné.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const status = request.nextUrl.searchParams.get("status") || "PENDING"

    const returnRequests = await prisma.driverReturnRequest.findMany({
      where: {
        storeId,
        ...(status !== "all" ? { status: status as any } : {}),
      },
      include: {
        deliveryPerson: { select: { id: true, name: true, phone: true, avatar: true } },
        product: { select: { id: true, name: true, sku: true, photos: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: returnRequests })
  } catch (error) {
    console.error("[STORE_DRIVER_RETURN_GET]", error)
    return NextResponse.json({ error: "Erreur" }, { status: 500 })
  }
}
