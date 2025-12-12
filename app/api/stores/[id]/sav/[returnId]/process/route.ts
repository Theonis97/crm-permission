import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Traiter un retour (approuver, rembourser, échanger, rejeter)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; returnId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id: storeId, returnId } = await params
    const body = await request.json()
    const { action } = body // APPROVED, REFUNDED, EXCHANGED, REJECTED

    // Vérifier que le retour existe et appartient au magasin
    const productReturn = await prisma.productReturn.findFirst({
      where: {
        id: returnId,
        storeId,
      },
      include: {
        items: {
          include: {
            product: true,
          }
        }
      }
    })

    if (!productReturn) {
      return NextResponse.json(
        { error: "Retour non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier les transitions de statut valides
    const validTransitions: Record<string, string[]> = {
      PENDING: ["APPROVED", "REJECTED"],
      APPROVED: ["REFUNDED", "EXCHANGED", "REJECTED"],
      REFUNDED: [],
      EXCHANGED: [],
      REJECTED: [],
    }

    if (!validTransitions[productReturn.status]?.includes(action)) {
      return NextResponse.json(
        { error: `Transition de ${productReturn.status} vers ${action} non autorisée` },
        { status: 400 }
      )
    }

    // Si on rembourse, on doit créer des mouvements de stock (entrée)
    if (action === "REFUNDED") {
      // Créer les mouvements de stock pour chaque item remboursé
      for (const item of productReturn.items) {
        if (item.isRefunded) {
          // Créer un mouvement de stock entrant (RETURN)
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              quantity: item.quantity, // Positif = entrée
              type: "RETURN",
              note: `Retour SAV #${productReturn.number} - ${item.productName}`,
              userId: session.user.id,
            }
          })

          // Mettre à jour le stock du produit principal
          await prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: { increment: item.quantity }
            }
          })

          // Mettre à jour le stock du magasin si StoreProduct existe
          const storeProduct = await prisma.storeProduct.findUnique({
            where: {
              storeId_productId: {
                storeId,
                productId: item.productId,
              }
            }
          })

          if (storeProduct) {
            await prisma.storeProduct.update({
              where: { id: storeProduct.id },
              data: {
                stock: { increment: item.quantity }
              }
            })
          }
        }
      }
    }

    // Mettre à jour le statut du retour
    const updatedReturn = await prisma.productReturn.update({
      where: { id: returnId },
      data: {
        status: action,
        processedById: session.user.id,
        processedAt: new Date(),
        resolution: action === "REFUNDED" 
          ? "Produits remboursés et remis en stock"
          : action === "EXCHANGED"
            ? "Produits échangés"
            : action === "REJECTED"
              ? "Retour rejeté"
              : "Retour approuvé, en attente de résolution",
      },
      include: {
        storeOrder: {
          select: {
            id: true,
            number: true,
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    return NextResponse.json(updatedReturn)
  } catch (error: any) {
    console.error("Erreur lors du traitement du retour:", error)
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    )
  }
}
