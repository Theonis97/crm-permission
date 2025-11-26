import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Créer une vente directe POS (client au magasin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const { id: storeId } = await params
    const body = await request.json()
    const {
      contactId,
      customerName,
      customerPhone,
      customerEmail,
      paymentMethod,
      notes,
      items,
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Aucun article dans la vente" },
        { status: 400 }
      )
    }

    if (!customerPhone) {
      return NextResponse.json(
        { error: "Téléphone du client requis" },
        { status: 400 }
      )
    }

    // Vérifier que le magasin existe
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    })

    if (!store) {
      return NextResponse.json(
        { error: "Magasin non trouvé" },
        { status: 404 }
      )
    }

    // Récupérer l'utilisateur actuel
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      )
    }

    // Vérifier la disponibilité de tous les produits
    const productIds = items.map((item: any) => item.productId)
    const storeProducts = await prisma.storeProduct.findMany({
      where: {
        storeId,
        productId: { in: productIds },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            prixVente: true,
          },
        },
      },
    })

    // Valider que tous les produits existent et ont assez de stock
    for (const item of items) {
      const storeProduct = storeProducts.find(sp => sp.productId === item.productId)
      
      if (!storeProduct) {
        return NextResponse.json(
          { error: `Produit ${item.productId} non trouvé dans le stock du magasin` },
          { status: 404 }
        )
      }

      if (storeProduct.stock < item.quantity) {
        return NextResponse.json(
          { error: `Stock insuffisant pour ${storeProduct.product.name}. Disponible: ${storeProduct.stock}, Demandé: ${item.quantity}` },
          { status: 400 }
        )
      }

      if (item.quantity <= 0) {
        return NextResponse.json(
          { error: `La quantité doit être supérieure à 0` },
          { status: 400 }
        )
      }
    }

    // Générer un numéro de vente unique
    const now = new Date()
    const year = now.getFullYear().toString().slice(-2)
    const month = (now.getMonth() + 1).toString().padStart(2, "0")
    const day = now.getDate().toString().padStart(2, "0")
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    const seconds = now.getSeconds().toString().padStart(2, "0")
    const milliseconds = now.getMilliseconds().toString().padStart(3, "0")

    const saleNumber = `POS-${year}${month}${day}-${hours}${minutes}${seconds}${milliseconds}`

    // Calculer le total
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.unitPrice * item.quantity), 0)
    const taxAmount = items.reduce((sum: number, item: any) => {
      const storeProduct = storeProducts.find(sp => sp.productId === item.productId)
      const itemTotal = item.unitPrice * item.quantity
      const tva = storeProduct?.product ? 0 : 0 // TVA à récupérer depuis le produit si nécessaire
      return sum + (itemTotal * tva / 100)
    }, 0)
    const total = subtotal + taxAmount

    // Transaction pour mettre à jour les stocks et créer les mouvements
    const result = await prisma.$transaction(async (tx) => {
      const movements = []

      // Pour chaque produit : décrémenter le stock et créer un mouvement
      for (const item of items) {
        const { productId, quantity, unitPrice } = item
        
        // Trouver le produit en stock
        const storeProduct = storeProducts.find(sp => sp.productId === productId)!

        // Décrémenter le stock du magasin
        await tx.storeProduct.update({
          where: { id: storeProduct.id },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        })

        // Créer le mouvement de stock (SALE = sortie de stock)
        const movement = await tx.stockMovement.create({
          data: {
            productId,
            quantity: -quantity, // Quantité négative pour une sortie
            type: "SALE",
            note: `Vente POS ${saleNumber} - ${storeProduct.product.name} (${customerName || "Client"})`,
            userId: user.id,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        })

        movements.push(movement)
      }

      return { movements, saleNumber, total }
    }, {
      maxWait: 5000,
      timeout: 15000,
    })

    return NextResponse.json({
      success: true,
      number: result.saleNumber,
      total: result.total,
      movements: result.movements,
      message: `Vente ${result.saleNumber} enregistrée avec succès`,
    })
  } catch (error: any) {
    console.error("[STORE_POS_SALE_POST]", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'enregistrement de la vente" },
      { status: 500 }
    )
  }
}
