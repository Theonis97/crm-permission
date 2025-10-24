/**
 * Script pour tester la création d'une commande avec notification push
 * Usage: node scripts/test-order-creation.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestOrder() {
  try {
    console.log('🧪 Test de création de commande avec notification push...\n')

    // 1. Récupérer les données nécessaires
    console.log('1️⃣ Récupération des données...')
    
    const store = await prisma.store.findFirst({
      where: { isActive: true }
    })
    
    const zone = await prisma.deliveryZone.findFirst({
      where: { isActive: true }
    })
    
    const product = await prisma.product.findFirst()
    
    const user = await prisma.user.findFirst({
      where: { email: 'admin@example.com' }
    })

    if (!store || !zone || !product || !user) {
      console.log('❌ Données manquantes:', { store: !!store, zone: !!zone, product: !!product, user: !!user })
      return
    }

    console.log(`   🏪 Magasin: ${store.name}`)
    console.log(`   📍 Zone: ${zone.name}`)
    console.log(`   📦 Produit: ${product.name}`)

    // 2. Créer la commande directement via Prisma
    console.log('\n2️⃣ Création de la commande...')
    
    const orderNumber = `TEST-${Date.now()}`
    
    const order = await prisma.storeOrder.create({
      data: {
        number: orderNumber,
        storeId: store.id,
        customerName: 'Client Test Push',
        customerEmail: 'test@example.com',
        customerPhone: '+241 01 23 45 67',
        deliveryAddress: '123 Rue de Test, Libreville',
        deliveryZoneId: zone.id,
        total: 15000,
        deliveryFee: zone.deliveryFee || 1000,
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING',
        status: 'PENDING',
        priority: 'NORMAL',
        createdById: user.id, // Utiliser l'ID de l'utilisateur admin
        items: {
          create: [{
            productId: product.id,
            name: product.name,
            sku: product.sku,
            quantity: 2,
            unitPrice: product.prixVente || 7500,
            total: (product.prixVente || 7500) * 2,
          }]
        }
      },
      include: {
        deliveryZone: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    console.log(`   ✅ Commande créée: ${order.number}`)
    console.log(`   📍 Zone assignée: ${order.deliveryZone?.name}`)

    // 3. Simuler l'envoi de notification
    console.log('\n3️⃣ Test d\'envoi de notification...')
    
    if (order.deliveryZoneId && order.deliveryZone) {
      // Vérifier les livreurs de cette zone
      const drivers = await prisma.deliveryPerson.findMany({
        where: {
          isActive: true,
          deliveryZones: {
            some: {
              id: order.deliveryZoneId,
              isActive: true,
            },
          },
        },
        include: {
          pushTokens: {
            where: { isActive: true }
          }
        }
      })

      console.log(`   👥 ${drivers.length} livreur(s) dans la zone`)
      drivers.forEach(driver => {
        console.log(`   - ${driver.name}: ${driver.pushTokens.length} token(s)`)
      })

      if (drivers.length > 0 && drivers.some(d => d.pushTokens.length > 0)) {
        console.log('   📱 Notification devrait être envoyée !')
      } else {
        console.log('   ⚠️ Aucun token push disponible')
      }
    } else {
      console.log('   ❌ Pas de zone de livraison assignée')
    }

    console.log('\n✅ Test terminé avec succès !')
    console.log(`\n💡 Maintenant, vérifiez les logs du serveur pour voir si la notification a été envoyée.`)

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour nettoyer les commandes de test
async function cleanupTestOrders() {
  try {
    console.log('🧹 Nettoyage des commandes de test...')

    const result = await prisma.storeOrder.deleteMany({
      where: {
        OR: [
          { number: { startsWith: 'TEST-' } },
          { customerName: 'Client Test Push' },
        ],
      },
    })

    console.log(`✅ ${result.count} commande(s) de test supprimée(s)`)

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Gestion des arguments de ligne de commande
const command = process.argv[2]

switch (command) {
  case 'create':
  case undefined:
    createTestOrder()
    break
  case 'cleanup':
    cleanupTestOrders()
    break
  default:
    console.log('Usage:')
    console.log('  node scripts/test-order-creation.js create  # Créer une commande de test')
    console.log('  node scripts/test-order-creation.js cleanup # Nettoyer les commandes de test')
    break
}
