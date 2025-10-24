import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { geocodeAddress, isPointInPolygon } from "@/lib/geocoding"

/**
 * Route API pour créer une commande depuis WhatsApp Bot
 * POST /api/orders/from-whatsapp
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📱 Réception d\'une commande WhatsApp...')
    
    // Authentification par API Key
    const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')
    
    if (!apiKey || apiKey !== process.env.BACKEND_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Clé API invalide ou manquante" 
        }, 
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      deliveryAddress,
      productCode,
      quantity,
      price,
      phone,
    } = data

    console.log('📦 Données reçues:', { deliveryAddress, productCode, quantity, price, phone })

    // Validation des champs requis
    if (!deliveryAddress || !productCode || !quantity || !price || !phone) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Champs requis manquants (deliveryAddress, productCode, quantity, price, phone)" 
        },
        { status: 400 }
      )
    }

    // 1. Récupérer le premier magasin du système
    console.log('🏪 Récupération du premier magasin...')
    const store = await prisma.store.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    })

    if (!store) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Aucun magasin actif trouvé dans le système" 
        },
        { status: 404 }
      )
    }

    console.log(`✅ Magasin trouvé: ${store.name} (${store.id})`)

    // 2. Géocoder l'adresse de livraison
    console.log(`📍 Géocodage de l'adresse: "${deliveryAddress}"...`)
    const geocodingResult = await geocodeAddress(deliveryAddress)

    let deliveryLatitude: number | null = null
    let deliveryLongitude: number | null = null
    let deliveryZoneId: string | null = null

    if (!geocodingResult.success || !geocodingResult.coordinates) {
      console.warn('⚠️ Géocodage échoué, commande créée sans coordonnées')
    } else {
      deliveryLatitude = geocodingResult.coordinates.lat
      deliveryLongitude = geocodingResult.coordinates.lng
      console.log(`✅ Coordonnées trouvées: ${deliveryLatitude}, ${deliveryLongitude}`)

      // 3. Trouver la zone de livraison correspondante
      console.log('🗺️ Recherche de la zone de livraison...')
      const deliveryZones = await prisma.deliveryZone.findMany({
        where: {
          storeId: store.id,
          isActive: true
        }
      })

      for (const zone of deliveryZones) {
        const coordinates = zone.coordinates as Array<{ lat: number; lng: number }>
        const isInZone = isPointInPolygon(
          { lat: deliveryLatitude, lng: deliveryLongitude },
          coordinates
        )

        if (isInZone) {
          deliveryZoneId = zone.id
          console.log(`✅ Zone de livraison trouvée: ${zone.name} (${zone.id})`)
          break
        }
      }

      if (!deliveryZoneId) {
        console.warn('⚠️ Aucune zone de livraison ne correspond aux coordonnées')
      }
    }

    // 4. Rechercher le produit dans la base de données
    console.log(`🔍 Recherche du produit avec code: "${productCode}"...`)
    
    // Recherche par SKU exact d'abord
    let product = await prisma.product.findFirst({
      where: {
        sku: productCode
      }
    })

    // Si pas trouvé, recherche par nom partiel (productCode peut être dans le nom)
    if (!product) {
      console.log(`🔍 SKU non trouvé, recherche par nom contenant "${productCode}"...`)
      product = await prisma.product.findFirst({
        where: {
          OR: [
            { name: { contains: productCode, mode: 'insensitive' } },
            { sku: { contains: productCode, mode: 'insensitive' } }
          ]
        }
      })
    }

    if (!product) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Produit "${productCode}" introuvable dans le système` 
        },
        { status: 404 }
      )
    }

    console.log(`✅ Produit trouvé: ${product.name} (${product.id})`)

    // Vérifier le stock du produit dans le magasin
    const storeProduct = await prisma.storeProduct.findFirst({
      where: {
        storeId: store.id,
        productId: product.id
      }
    })

    if (!storeProduct || storeProduct.stock < quantity) {
      console.warn(`⚠️ Stock insuffisant. Disponible: ${storeProduct?.stock || 0}, Demandé: ${quantity}`)
      // On continue quand même la création de commande
    }

    // 5. Vérifier/créer le client avec le numéro de téléphone
    console.log(`👤 Recherche du client avec téléphone: ${phone}...`)
    
    // Récupérer le premier utilisateur système pour assigner le contact
    const systemUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!systemUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Aucun utilisateur système trouvé" 
        },
        { status: 500 }
      )
    }

    let contact = await prisma.contact.findFirst({
      where: { phone: phone }
    })

    if (!contact) {
      console.log('➕ Client non trouvé, création d\'un nouveau contact...')
      
      // Extraire un nom du téléphone ou utiliser un générique
      const customerName = `Client ${phone.slice(-4)}`
      
      contact = await prisma.contact.create({
        data: {
          firstName: customerName,
          phone: phone,
          type: 'PERSONNE',
          status: 'CLIENT',
          assignedUserId: systemUser.id
        }
      })
      
      console.log(`✅ Nouveau contact créé: ${contact.firstName} (${contact.id})`)
    } else {
      console.log(`✅ Contact existant trouvé: ${contact.firstName || contact.lastName || phone} (${contact.id})`)
    }

    // Créer ou mettre à jour la relation store-contact
    const storeContact = await prisma.storeContact.upsert({
      where: {
        storeId_contactId: {
          storeId: store.id,
          contactId: contact.id
        }
      },
      create: {
        storeId: store.id,
        contactId: contact.id,
        totalOrders: 0,
        totalSpent: 0
      },
      update: {}
    })

    // 6. Créer la commande
    console.log('📝 Création de la commande...')
    
    // Générer un numéro de commande unique
    const orderCount = await prisma.storeOrder.count()
    const orderNumber = `WA-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, "0")}`

    const unitPrice = price / quantity
    const subtotal = price
    const totalTax = (subtotal * product.tva) / 100
    const deliveryFee = deliveryZoneId ? 
      (await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } }))?.deliveryFee || 0 
      : 0
    const total = subtotal + totalTax + deliveryFee

    const order = await prisma.storeOrder.create({
      data: {
        number: orderNumber,
        storeId: store.id,
        contactId: contact.id,
        customerName: contact.firstName || contact.lastName || `Client ${phone}`,
        customerPhone: phone,
        customerEmail: contact.email,
        deliveryAddress: deliveryAddress,
        deliveryLatitude: deliveryLatitude,
        deliveryLongitude: deliveryLongitude,
        deliveryZoneId: deliveryZoneId,
        status: 'PENDING',
        priority: 'NORMAL',
        subtotal: subtotal,
        totalDiscount: 0,
        totalTax: totalTax,
        deliveryFee: deliveryFee,
        total: total,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        createdById: systemUser.id,
        items: {
          create: [{
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantity: quantity,
            unitPrice: unitPrice,
            taxRate: product.tva,
            discount: 0,
            total: subtotal + totalTax
          }]
        }
      },
      include: {
        items: true,
        deliveryZone: true
      }
    })

    console.log(`✅ Commande créée: ${order.number} (${order.id})`)

    // Mettre à jour les statistiques du store-contact
    await prisma.storeContact.update({
      where: {
        storeId_contactId: {
          storeId: store.id,
          contactId: contact.id
        }
      },
      data: {
        totalOrders: { increment: 1 },
        totalSpent: { increment: total },
        lastOrderAt: new Date()
      }
    })

    console.log('🎉 Commande WhatsApp créée avec succès!')

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.number,
      message: `Commande ${order.number} créée avec succès`,
      details: {
        store: store.name,
        product: product.name,
        quantity: quantity,
        total: total,
        deliveryZone: order.deliveryZone?.name || 'Non définie',
        coordinates: geocodingResult.success ? 
          `${deliveryLatitude}, ${deliveryLongitude}` : 
          'Non géocodée'
      }
    })

  } catch (error) {
    console.error('❌ Erreur lors de la création de la commande WhatsApp:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Erreur serveur lors de la création de la commande",
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    )
  }
}
