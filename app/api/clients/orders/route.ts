import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { storeId, subBoxCode, customerName, items } = body

    if (!storeId || !subBoxCode || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // 1. Trouver la sous-caisse correspondante via le code (ex: "CLIENT")
    // On suppose qu'il y a un champ 'code' ou 'name' unique, ou on prend la première du store si c'est générique.
    // D'après la demande, on utilise le code SUB_BOX=CLIENT.
    // Il faut vérifier si le modèle SubBox a un champ 'code' ou 'name' qui correspond.
    // Si pas de champ code, on cherchera par nom ou ID si c'est un ID.
    
    // Tentative de trouver la SubBox. 
    // Note: Si le code SUB_BOX est un ID, on cherche par ID. Si c'est un code "CLIENT", on cherche par nom ?
    // On va assumer que l'utilisateur a configuré un ID ou qu'on doit chercher une subbox "CLIENT".
    // Pour être sûr, on va chercher une SubBox qui appartient au store.
    
    let subBox = await prisma.subBox.findFirst({
        where: {
            storeId: storeId,
            // On cherche une subbox qui pourrait correspondre au "CLIENT"
            // Soit par ID si le format est un CUID, soit par nom
            OR: [
                { id: subBoxCode },
                { name: subBoxCode }
            ]
        }
    })

    if (!subBox) {
        // Fallback: Si aucune subbox trouvée, on prend la première active du store pour ne pas bloquer
        // Ou on renvoie une erreur. Mieux vaut renvoyer une erreur pour configurer correctement.
         return NextResponse.json(
            { error: "Sous-caisse 'CLIENT' introuvable pour ce magasin" },
            { status: 404 }
        )
    }

    // 2. Calculer les totaux et préparer les items
    let subtotal = 0
    let totalItems = 0
    const orderItemsData: {
      productId: string
      name: string
      sku: string | null
      unitPrice: number
      quantity: number
      total: number
    }[] = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      })

      if (!product) continue

      const price = product.prixVente || 0
      const quantity = item.quantity
      const total = price * quantity

      subtotal += total
      totalItems += quantity

      orderItemsData.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: price,
        quantity: quantity,
        total: total,
      })
    }

    // 3. Créer la commande via une transaction
    const order = await prisma.$transaction(async (tx) => {
        // Créer l'ordre
        const newOrder = await tx.subBoxOrder.create({
            data: {
                subBoxId: subBox.id,
                storeId: storeId,
                clientCode: customerName || "Anonyme", // On utilise le nom du client comme code pour l'instant
                status: "PENDING",
                subtotal: subtotal,
                totalItems: totalItems,
                notes: `Commande client web - ${customerName}`,
                items: {
                    create: orderItemsData
                }
            }
        })
        return newOrder
    })

    return NextResponse.json({
        success: true,
        data: {
            orderId: order.id,
            total: subtotal,
            date: order.createdAt
        }
    })

  } catch (error) {
    console.error("Error creating client order:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de la commande" },
      { status: 500 }
    )
  }
}
