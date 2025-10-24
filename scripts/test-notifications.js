/**
 * Script de test pour les notifications push
 * Usage: node scripts/test-notifications.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Simuler le service de notifications pour les tests
class TestPushNotificationService {
  static async sendNewOrderNotification(zoneId, notificationData) {
    console.log(`🔧 [TEST] Simulation d'envoi de notification`)
    console.log(`   Zone: ${notificationData.zoneName} (${zoneId})`)
    console.log(`   Commande: ${notificationData.orderNumber}`)
    console.log(`   Client: ${notificationData.customerName}`)
    console.log(`   Montant: ${notificationData.total}€`)
    console.log(`   Adresse: ${notificationData.deliveryAddress}`)
    return Promise.resolve()
  }

  static async cleanupOldTokens() {
    console.log('🔧 [TEST] Simulation du nettoyage des anciens tokens')
    const result = await prisma.deliveryPersonPushToken.deleteMany({
      where: {
        OR: [
          { token: { startsWith: 'ExponentPushToken[DEV-' } },
          { platform: 'test' },
          { 
            AND: [
              { isActive: false },
              { updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
            ]
          }
        ],
      },
    })
    console.log(`🗑️ ${result.count} token(s) nettoyé(s)`)
    return result
  }
}

async function testNotifications() {
  try {
    console.log('🧪 Test du système de notifications push...\n')

    // 1. Vérifier les livreurs avec tokens
    console.log('1️⃣ Vérification des tokens push...')
    const driversWithTokens = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true,
        pushTokens: {
          some: {
            isActive: true,
          },
        },
      },
      include: {
        pushTokens: {
          where: { isActive: true },
        },
        deliveryZones: {
          where: { isActive: true },
          select: { id: true, name: true },
        },
      },
    })

    console.log(`   📱 ${driversWithTokens.length} livreur(s) avec tokens actifs`)
    driversWithTokens.forEach(driver => {
      console.log(`   - ${driver.name}: ${driver.pushTokens.length} token(s)`)
      driver.deliveryZones.forEach(zone => {
        console.log(`     Zone: ${zone.name} (${zone.id})`)
      })
    })

    if (driversWithTokens.length === 0) {
      console.log('   ⚠️ Aucun livreur avec token push trouvé')
      console.log('   💡 Connectez-vous à l\'app mobile pour enregistrer un token\n')
      return
    }

    // 2. Tester l'envoi de notification
    console.log('\n2️⃣ Test d\'envoi de notification...')
    const testDriver = driversWithTokens[0]
    const testZone = testDriver.deliveryZones[0]

    if (!testZone) {
      console.log('   ⚠️ Le livreur n\'a pas de zone assignée')
      return
    }

    const testNotificationData = {
      orderId: 'test-' + Date.now(),
      orderNumber: 'TEST-' + Math.floor(Math.random() * 1000),
      customerName: 'Client Test',
      deliveryAddress: '123 Rue de Test, Ville Test',
      total: 15000,
      zoneId: testZone.id,
      zoneName: testZone.name,
    }

    console.log(`   📤 Envoi vers zone "${testZone.name}"...`)
    await TestPushNotificationService.sendNewOrderNotification(
      testZone.id,
      testNotificationData
    )

    console.log('   ✅ Notification de test envoyée !')

    // 3. Statistiques
    console.log('\n3️⃣ Statistiques...')
    const totalTokens = await prisma.deliveryPersonPushToken.count({
      where: { isActive: true },
    })
    const totalDrivers = await prisma.deliveryPerson.count({
      where: { isActive: true },
    })
    const totalZones = await prisma.deliveryZone.count({
      where: { isActive: true },
    })

    console.log(`   📊 ${totalTokens} tokens actifs`)
    console.log(`   👥 ${totalDrivers} livreurs actifs`)
    console.log(`   🗺️ ${totalZones} zones actives`)

    // 4. Nettoyage des anciens tokens (optionnel)
    console.log('\n4️⃣ Nettoyage des anciens tokens...')
    await TestPushNotificationService.cleanupOldTokens()

    console.log('\n✅ Test terminé avec succès !')

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour créer un token de test
async function createTestToken() {
  try {
    console.log('🔧 Création d\'un token de test...')

    // Trouver le premier livreur actif
    const driver = await prisma.deliveryPerson.findFirst({
      where: { isActive: true },
    })

    if (!driver) {
      console.log('❌ Aucun livreur actif trouvé')
      return
    }

    // Créer un token de test (ne fonctionnera pas vraiment)
    const testToken = 'ExponentPushToken[TEST-' + Date.now() + ']'
    
    await prisma.deliveryPersonPushToken.create({
      data: {
        deliveryPersonId: driver.id,
        token: testToken,
        deviceId: 'test-device',
        platform: 'test',
        isActive: true,
      },
    })

    console.log(`✅ Token de test créé pour ${driver.name}`)
    console.log(`   Token: ${testToken}`)

  } catch (error) {
    console.error('❌ Erreur création token test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour nettoyer les tokens de test
async function cleanupTestTokens() {
  try {
    console.log('🧹 Nettoyage des tokens de test...')

    const result = await prisma.deliveryPersonPushToken.deleteMany({
      where: {
        OR: [
          { token: { startsWith: 'ExponentPushToken[TEST-' } },
          { platform: 'test' },
        ],
      },
    })

    console.log(`✅ ${result.count} token(s) de test supprimé(s)`)

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Gestion des arguments de ligne de commande
const command = process.argv[2]

switch (command) {
  case 'test':
    testNotifications()
    break
  case 'create-token':
    createTestToken()
    break
  case 'cleanup':
    cleanupTestTokens()
    break
  default:
    console.log('Usage:')
    console.log('  node scripts/test-notifications.js test         # Tester les notifications')
    console.log('  node scripts/test-notifications.js create-token # Créer un token de test')
    console.log('  node scripts/test-notifications.js cleanup      # Nettoyer les tokens de test')
    break
}
