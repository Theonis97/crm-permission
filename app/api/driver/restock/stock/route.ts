import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getActiveDeliveryPersonByUserEmail } from "@/lib/driver-session"
import { userCanAccessDriverRestock } from "@/lib/driver-restock-access"

/**
 * GET /api/driver/restock/stock
 * Stock du livreur connecté, ou ?deliveryPersonId=… en mode gestionnaire.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { allowed, reason } = await userCanAccessDriverRestock(session.user.id, session.user.email)
    if (!allowed) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
    }

    let deliveryPersonId: string

    if (reason === "staff") {
      const qp = req.nextUrl.searchParams.get("deliveryPersonId")
      if (!qp) {
        return NextResponse.json(
          { success: false, error: "Paramètre deliveryPersonId requis (mode gestionnaire)." },
          { status: 400 },
        )
      }
      const dp = await prisma.deliveryPerson.findFirst({
        where: { id: qp, isActive: true },
        select: { id: true, name: true },
      })
      if (!dp) {
        return NextResponse.json({ success: false, error: "Livreur invalide" }, { status: 400 })
      }
      deliveryPersonId = dp.id
    } else {
      // Livreur (par email ou par rôle)
      const driverSelf = await getActiveDeliveryPersonByUserEmail(session.user.email)
      if (!driverSelf) {
        // Rôle livreur présent mais aucune fiche livreur : stock vide
        return NextResponse.json({
          success: true,
          data: {
            items: [],
            summary: { totalItems: 0, totalProducts: 0 },
          },
          warning: "no_driver_profile",
          message: "Votre compte n'a pas encore de fiche livreur associée. Contactez un administrateur.",
        })
      }
      deliveryPersonId = driverSelf.id
    }

    const stock = await prisma.deliveryPersonStock.findMany({
      where: { deliveryPersonId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            photos: true,
            prixVente: true,
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            attributes: true,
            prixVente: true,
            images: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    })

    const totalItems = stock.reduce((sum, row) => sum + row.quantity, 0)

    return NextResponse.json({
      success: true,
      data: {
        items: stock,
        summary: {
          totalItems,
          totalProducts: stock.length,
        },
      },
    })
  } catch (e) {
    console.error("[driver/restock/stock GET]", e)
    return NextResponse.json({ success: false, error: "Erreur lors du chargement du stock" }, { status: 500 })
  }
}
