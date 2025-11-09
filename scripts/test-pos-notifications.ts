/**
 * Script de test des notifications push POS
 * 
 * Ce script simule l'envoi de notifications aux livreurs d'une zone
 * pour tester le système sans créer de vraie commande.
 * 
 * Usage:
 *   npx tsx scripts/test-pos-notifications.ts <zoneId>
 * 
 * Exemple:
 *   npx tsx scripts/test-pos-notifications.ts cm3k5678...
 */

import { ExpoPushService } from '../lib/notifications/expo-push-service'
import { prisma } from '../lib/prisma'

async function testPOSNotifications(zoneId?: string) {
  console.log('🧪 Test des notifications push POS\n')

  try {
    // Si aucune zone spécifiée, utiliser la première zone active
    if (!zoneId) {
      console.log('⚠️ Aucune zone spécifiée, recherche d\'une zone active...\n')
      
      const zone = await prisma.deliveryZone.findFirst({
        where: { isActive: true },
        include: { store: true }
      })

      if (!zone) {
        console.error('❌ Aucune zone active trouvée dans la base de données')
        process.exit(1)
      }

      zoneId = zone.id
      console.log(`✅ Zone trouvée: ${zone.name} (${zone.store.name})`)
      console.log(`   ID: ${zoneId}\n`)
    }

    // 1. Vérifier la zone
    console.log('📍 Vérification de la zone...')
    const zone = await prisma.deliveryZone.findUnique({
      where: { id: zoneId },
      include: { store: true }
    })

    if (!zone) {
      console.error(`❌ Zone ${zoneId} introuvable`)
      process.exit(1)
    }

    console.log(`   ✅ Zone: ${zone.name}`)
    console.log(`   ✅ Magasin: ${zone.store.name}`)
    console.log(`   ✅ Active: ${zone.isActive ? 'Oui' : 'Non'}\n`)

    // 2. Vérifier les livreurs de la zone
    console.log('👥 Vérification des livreurs...')
    const deliveryPersons = await prisma.deliveryPerson.findMany({
      where: {
        isActive: true,
        deliveryZones: {
          some: {
            id: zoneId,
            isActive: true,
          },
        },
      },
      include: {
        pushTokens: {
          where: { isActive: true },
        },
      },
    })

    console.log(`   📊 ${deliveryPersons.length} livreur(s) actif(s) dans la zone\n`)

    if (deliveryPersons.length === 0) {
      console.warn('⚠️ Aucun livreur actif dans cette zone')
      console.warn('   Impossible d\'envoyer des notifications\n')
      
      console.log('💡 Solutions:')
      console.log('   1. Assigner des livreurs à cette zone')
      console.log('   2. Activer des livreurs existants')
      console.log('   3. Choisir une autre zone\n')
      
      process.exit(0)
    }

    // Afficher les détails des livreurs
    deliveryPersons.forEach((person, index) => {
      console.log(`   ${index + 1}. ${person.name}`)
      console.log(`      📧 ${person.email}`)
      console.log(`      📱 ${person.phone}`)
      console.log(`      🔔 ${person.pushTokens.length} token(s) push`)
      
      person.pushTokens.forEach((token, tokenIndex) => {
        const tokenPreview = token.token.substring(0, 30) + '...'
        console.log(`         ${tokenIndex + 1}) ${tokenPreview}`)
      })
      console.log()
    })

    // Compter les tokens
    const totalTokens = deliveryPersons.reduce(
      (sum, person) => sum + person.pushTokens.length,
      0
    )

    if (totalTokens === 0) {
      console.warn('⚠️ Aucun token push actif trouvé')
      console.warn('   Les livreurs doivent ouvrir l\'app mobile pour enregistrer leur token\n')
      process.exit(0)
    }

    // 3. Demander confirmation
    console.log(`📤 Prêt à envoyer ${totalTokens} notification(s) de test\n`)
    console.log('⚠️  Appuyez sur CTRL+C pour annuler ou attendez 3 secondes...\n')

    await new Promise(resolve => setTimeout(resolve, 3000))

    // 4. Envoyer la notification de test
    console.log('📱 Envoi de la notification de test...\n')

    const testData = {
      type: 'NEW_ORDER' as const,
      orderId: 'TEST-' + Date.now(),
      orderNumber: 'CMD-TEST-' + Math.floor(Math.random() * 10000),
      amount: '15000',
      zone: zone.name,
      customerName: 'Client Test',
      action: 'VIEW_ORDER' as const,
    }

    const success = await ExpoPushService.notifyDriversInZone(
      zoneId,
      '🧪 Test POS - Nouvelle commande !',
      `Commande ${testData.orderNumber} - ${testData.amount} FCFA - ${testData.customerName}`,
      testData
    )

    console.log()
    
    if (success) {
      console.log('✅ Test réussi !')
      console.log('   Les livreurs devraient recevoir la notification sur leur mobile\n')
      
      console.log('📋 Vérifications à faire:')
      console.log('   1. Ouvrir l\'app Inotech Driver sur mobile')
      console.log('   2. Vérifier qu\'une notification est apparue')
      console.log('   3. Vérifier que le badge de notifications a augmenté')
      console.log('   4. Vérifier que les données de commande sont correctes\n')
    } else {
      console.error('❌ Échec de l\'envoi')
      console.error('   Vérifier les logs ci-dessus pour plus de détails\n')
    }

    // 5. Statistiques finales
    console.log('📊 Statistiques:')
    console.log(`   Zone: ${zone.name}`)
    console.log(`   Livreurs: ${deliveryPersons.length}`)
    console.log(`   Tokens: ${totalTokens}`)
    console.log(`   Statut: ${success ? '✅ Succès' : '❌ Échec'}\n`)

  } catch (error) {
    console.error('❌ Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Récupérer l'ID de zone depuis les arguments
const zoneId = process.argv[2]

testPOSNotifications(zoneId)
  .then(() => {
    console.log('✅ Test terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
