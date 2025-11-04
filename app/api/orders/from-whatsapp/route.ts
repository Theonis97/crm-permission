import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { geocodeAddress, isPointInPolygon } from "@/lib/geocoding"
import { notifyAdminFailedOrder } from "@/lib/whatsapp-notifications"

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
      customerName,
      products,
      totalAmount,
      phone,
      orderSource = 'whatsapp',
      rawMessage,
      senderId,
      timestamp,
      isValid = true,
      errors = []
    } = data

    console.log('📦 Données reçues:', { 
      deliveryAddress, 
      customerName, 
      products: products?.length || 0, 
      totalAmount, 
      phone, 
      isValid,
      errors 
    })

    // Validation des champs requis
    if (!phone || !products || products.length === 0 || !totalAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Champs requis manquants (phone, products, totalAmount)" 
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
        console.warn('⚠️ Les coordonnées seront annulées car hors zone de service')
        // Annuler les coordonnées car hors des zones de livraison
        deliveryLatitude = null
        deliveryLongitude = null
      }
    }

    // 4. Rechercher et valider les produits
    console.log(`🔍 Recherche de ${products.length} produit(s)...`)
    
    const orderItems = []
    const missingProducts: string[] = []
    let subtotal = 0

    for (const productData of products) {
      const { productCode, quantity, unitPrice, total } = productData
      console.log(`🔍 Recherche produit: "${productCode}"`)
      
      // Recherche par SKU exact d'abord
      let product = await prisma.product.findFirst({
        where: {
          sku: productCode
        }
      })

      // Si pas trouvé, recherche par nom partiel
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
        console.error(`❌ Produit "${productCode}" introuvable dans la base de données`)
        missingProducts.push(productCode)
        continue // Continuer au lieu de retourner une erreur
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
        console.warn(`⚠️ Stock insuffisant pour ${product.name}. Disponible: ${storeProduct?.stock || 0}, Demandé: ${quantity}`)
      }

      // Utiliser le prix du message ou le prix du produit
      const finalUnitPrice = unitPrice || product.prixVente
      const finalTotal = total || (finalUnitPrice * quantity)

      orderItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        quantity: quantity || 1,
        unitPrice: finalUnitPrice,
        taxRate: product.tva || 0,
        discount: 0,
        total: finalTotal
      })

      subtotal += finalTotal
    }

    // 4.1. Si des produits sont manquants, enregistrer dans la table des commandes échouées
    if (missingProducts.length > 0) {
      console.log(`🚨 ${missingProducts.length} produit(s) non trouvé(s), enregistrement dans failed_whatsapp_orders...`)
      
      const failedOrder = await prisma.failedWhatsAppOrder.create({
        data: {
          rawMessage: rawMessage || JSON.stringify(data),
          senderId: senderId,
          senderPhone: phone,
          timestamp: timestamp ? new Date(timestamp) : new Date(),
          customerName: customerName,
          customerPhone: phone,
          deliveryAddress: deliveryAddress,
          totalAmount: totalAmount,
          requestedProducts: products,
          errorType: 'PRODUCT_NOT_FOUND',
          errorDetails: `Les produits suivants n'ont pas été trouvés dans la base de données : ${missingProducts.join(', ')}`,
          missingProducts: missingProducts,
          status: 'PENDING'
        }
      })

      console.log(`💾 Commande avec erreurs enregistrée: ${failedOrder.id}`)

      // Envoyer une notification WhatsApp à l'admin
      await notifyAdminFailedOrder({
        customerName: customerName,
        customerPhone: phone,
        deliveryAddress: deliveryAddress,
        totalAmount: totalAmount,
        missingProducts: missingProducts,
        failedOrderId: failedOrder.id
      }).catch(err => {
        console.error('⚠️ Erreur notification admin (non bloquante):', err)
      })

      return NextResponse.json({
        success: false,
        error: `Produit(s) non trouvé(s): ${missingProducts.join(', ')}`,
        failedOrderId: failedOrder.id,
        details: {
          missingProducts: missingProducts,
          totalProducts: products.length,
          message: 'La commande a été enregistrée dans les commandes à traiter manuellement'
        }
      }, { status: 400 })
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
      
      // Utiliser le nom fourni ou générer un nom générique
      const finalCustomerName = customerName || `Client ${phone.slice(-4)}`
      
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

    // 6. Déterminer le statut de la commande et créer les notes
    console.log('📝 Création de la commande...')
    
    // Générer un numéro de commande unique
    const orderCount = await prisma.storeOrder.count()
    const orderNumber = `WA-${new Date().getFullYear()}-${String(orderCount + 1).padStart(6, "0")}`

    // Déterminer le statut selon la validité
    const orderStatus = isValid ? 'PENDING' : 'TOBEVALIDATED' as any
    
    // Calculer les totaux
    const deliveryFee = deliveryZoneId ? 
      (await prisma.deliveryZone.findUnique({ where: { id: deliveryZoneId } }))?.deliveryFee || 0 
      : 0
    
    const totalTax = subtotal * 0.05 // 5% de TVA par défaut
    const finalTotal = totalAmount || (subtotal + totalTax + deliveryFee)

    // Créer les notes détaillées
    const orderNotes = []
    
    // Ajouter les erreurs détectées
    if (errors.length > 0) {
      orderNotes.push(`🏷️ ERREURS DÉTECTÉES: ${errors.join(', ')}`)
    }
    
    // Note: Les produits non trouvés causent maintenant un arrêt immédiat de l'API
    
    // Ajouter les spécificités des produits (couleurs, tailles, etc.)
    const productSpecifics: string[] = []
    products.forEach((p: any) => {
      if (p.productCode.includes('vert') || p.productCode.includes('rose') || p.productCode.includes('violet')) {
        const colors: string[] = []
        if (p.productCode.includes('vert')) colors.push('vert')
        if (p.productCode.includes('rose')) colors.push('rose')
        if (p.productCode.includes('violet')) colors.push('violet')
        productSpecifics.push(`${p.productCode}: couleur(s) ${colors.join(', ')}`)
      }
      if (p.productCode.includes('12L') || p.productCode.includes('32g')) {
        const specs = p.productCode.match(/\d+[LGlg]/g) || []
        if (specs.length > 0) {
          productSpecifics.push(`${p.productCode}: spécifications ${specs.join(', ')}`)
        }
      }
    })
    
    if (productSpecifics.length > 0) {
      orderNotes.push(`🎨 SPÉCIFICITÉS: ${productSpecifics.join(' | ')}`)
    }
    
    // Ajouter le message brut pour référence
    if (rawMessage) {
      orderNotes.push(`📱 MESSAGE ORIGINAL: ${rawMessage.substring(0, 200)}${rawMessage.length > 200 ? '...' : ''}`)
    }

    const order = await prisma.storeOrder.create({
      data: {
        number: orderNumber,
        storeId: store.id,
        contactId: contact.id,
        customerName: customerName || contact.firstName || contact.lastName || `Client ${phone}`,
        customerPhone: phone,
        customerEmail: contact.email,
        deliveryAddress: deliveryAddress || 'Adresse non précisée',
        deliveryLatitude: deliveryLatitude,
        deliveryLongitude: deliveryLongitude,
        deliveryZoneId: deliveryZoneId,
        status: orderStatus,
        priority: 'NORMAL',
        subtotal: subtotal,
        totalDiscount: 0,
        totalTax: totalTax,
        deliveryFee: deliveryFee,
        total: finalTotal,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        orderSource: orderSource,
        notes: orderNotes.join('\n'),
        createdById: systemUser.id,
        items: {
          create: orderItems as any
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
        totalSpent: { increment: finalTotal },
        lastOrderAt: new Date()
      }
    })

    console.log(`🎉 Commande WhatsApp créée avec succès! Statut: ${orderStatus}`)

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.number,
      message: `Commande ${order.number} créée avec succès`,
      status: orderStatus,
      needsValidation: !isValid,
      details: {
        store: store.name,
        productsCount: products.length,
        validProducts: orderItems.filter(item => item.productId !== null).length,
        invalidProducts: 0, // Produits non trouvés causent maintenant un arrêt immédiat
        total: finalTotal,
        deliveryZone: deliveryZoneId ? 'Zone trouvée' : 'Non définie',
        coordinates: geocodingResult.success ? 
          `${deliveryLatitude}, ${deliveryLongitude}` : 
          'Non géocodée',
        errors: errors.length > 0 ? errors : undefined
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
