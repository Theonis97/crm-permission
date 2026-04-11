import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { Prisma, RestockingRequestStatus } from "@prisma/client"

/**
 * GET /api/restocking-requests
 * Récupérer les demandes d'approvisionnement (avec filtres)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const storeIdRaw = searchParams.get("storeId")
    const deliveryPersonIdRaw = searchParams.get("deliveryPersonId")
    const status = searchParams.get("status")

    const storeId =
      storeIdRaw && storeIdRaw !== "undefined" && storeIdRaw.trim() !== "" ? storeIdRaw.trim() : null
    const deliveryPersonId =
      deliveryPersonIdRaw &&
        deliveryPersonIdRaw !== "undefined" &&
        deliveryPersonIdRaw.trim() !== ""
        ? deliveryPersonIdRaw.trim()
        : null

    if (!storeId && !deliveryPersonId) {
      return NextResponse.json(
        {
          success: false,
          error: "Indiquez storeId (magasin) ou deliveryPersonId (livreur).",
        },
        { status: 400 },
      )
    }

    // Construire les filtres
    const where: Prisma.RestockingRequestWhereInput = {}

    if (storeId) {
      /* Stratégie robuste :
       * 1. Chercher le nom du magasin par son ID.
       * 2. Filtrer les demandes par ce NOM (relation store.name) plutôt que par l'ID seul.
       *    → Capture les demandes créées sous un ID différent mais le même magasin (doublons / réimportation).
       * 3. Si le magasin n'est pas trouvé, filtrer quand même par ID brut. */
      const current = await prisma.store.findFirst({
        where: { id: storeId },
        select: { name: true },
      })
      if (current?.name) {
        // Filtre par nom via la relation — inclut tous les enregistrements, actifs ou non
        where.store = { name: current.name }
      } else {
        where.storeId = storeId
      }
    }

    if (deliveryPersonId) {
      where.deliveryPersonId = deliveryPersonId
    }

    if (status) {
      where.status = status as RestockingRequestStatus
    }

    const requests = await prisma.restockingRequest.findMany({
      where,
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                attributes: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      success: true,
      data: requests,
    })
  } catch (error) {
    console.error("❌ Get restocking requests error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la récupération des demandes" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/restocking-requests
 * Créer une nouvelle demande d'approvisionnement
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const body = await request.json()
    const { deliveryPersonId, storeId, notes, items } = body

    // Validation des paramètres requis
    if (!deliveryPersonId || !storeId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Paramètres requis manquants" },
        { status: 400 }
      )
    }

    // Vérifier que le livreur existe et appartient au magasin
    const deliveryPerson = await prisma.deliveryPerson.findFirst({
      where: {
        id: deliveryPersonId,
        storeId: storeId,
        isActive: true,
      },
    })

    if (!deliveryPerson) {
      return NextResponse.json(
        { success: false, error: "Livreur introuvable ou inactif" },
        { status: 404 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { success: false, error: "Magasin introuvable" },
        { status: 404 }
      )
    }

    // Créer la demande d'approvisionnement avec ses items
    const restockingRequest = await prisma.$transaction(async (tx) => {
      // 1. Créer la demande
      const request = await tx.restockingRequest.create({
        data: {
          deliveryPersonId,
          storeId,
          notes,
          status: "PENDING",
        },
      })

      // 2. Créer les items
      const requestItems = await Promise.all(
        items.map((item: any) =>
          tx.restockingRequestItem.create({
            data: {
              restockingRequestId: request.id,
              productId: item.productId,
              variantId: item.variantId,
              requestedQuantity: item.requestedQuantity || item.quantity,
              notes: item.notes,
            },
          })
        )
      )

      return { request, items: requestItems }
    })

    // Récupérer la demande complète avec les relations
    const completeRequest = await prisma.restockingRequest.findUnique({
      where: { id: restockingRequest.request.id },
      include: {
        deliveryPerson: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        store: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                photos: true,
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                sku: true,
                attributes: true,
              },
            },
          },
        },
      },
    })

    console.log(`✅ Demande d'approvisionnement créée: ${completeRequest?.id} pour ${deliveryPerson.name}`)

    return NextResponse.json({
      success: true,
      message: "Demande d'approvisionnement créée avec succès",
      data: completeRequest,
    })
  } catch (error) {
    console.error("❌ Create restocking request error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la création de la demande" },
      { status: 500 }
    )
  }
}
