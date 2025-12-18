import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET - Liste des sous-caisses d'un magasin avec le nombre de commandes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params

    const subBoxes = await prisma.subBox.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    })

    // Récupérer le nombre de commandes en attente pour chaque sous-caisse
    const subBoxesWithPendingCount = await Promise.all(
      subBoxes.map(async (subBox) => {
        const pendingCount = await prisma.subBoxOrder.count({
          where: {
            subBoxId: subBox.id,
            status: "PENDING",
          },
        })

        return {
          ...subBox,
          totalOrders: subBox._count.orders,
          pendingOrders: pendingCount,
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: subBoxesWithPendingCount,
    })
  } catch (error) {
    console.error("[SUB_BOXES_GET]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des sous-caisses" },
      { status: 500 }
    )
  }
}

// POST - Créer une nouvelle sous-caisse
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: storeId } = await params
    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Le nom et le code sont requis" },
        { status: 400 }
      )
    }

    // Vérifier si le code existe déjà pour ce magasin
    const existingSubBox = await prisma.subBox.findUnique({
      where: {
        storeId_code: {
          storeId,
          code: code.toUpperCase(),
        },
      },
    })

    if (existingSubBox) {
      return NextResponse.json(
        { success: false, error: "Ce code de sous-caisse existe déjà" },
        { status: 400 }
      )
    }

    const subBox = await prisma.subBox.create({
      data: {
        storeId,
        name: name.trim(),
        code: code.toUpperCase().trim(),
      },
    })

    return NextResponse.json({
      success: true,
      data: subBox,
    })
  } catch (error) {
    console.error("[SUB_BOXES_POST]", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création de la sous-caisse" },
      { status: 500 }
    )
  }
}
