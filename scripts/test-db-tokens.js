/**
 * Script simple pour tester la base de données des tokens push
 * Usage: node scripts/test-db-tokens.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDatabase() {
  try {
    console.log('🔍 Test de la base de données des tokens push...\n')

    // 1. Vérifier la table des tokens
    console.log('1️⃣ Vérification de la table des tokens...')
    const tokenCount = await prisma.deliveryPersonPushToken.count()
    console.log(`   📱 ${tokenCount} token(s) total dans la base`)

    // 2. Lister les tokens actifs
    const activeTokens = await prisma.deliveryPersonPushToken.findMany({
      where: { isActive: true },
      include: {
        deliveryPerson: {
          select: {
            name: true,
            isActive: true,
          }
        }
      }
    })

    console.log(`   ✅ ${activeTokens.length} token(s) actif(s)`)
    activeTokens.forEach(token => {
      const tokenPreview = token.token.substring(0, 30) + '...'
      console.log(`   - ${token.deliveryPerson.name}: ${tokenPreview} (${token.platform || 'unknown'})`)
    })

    // 3. Vérifier les livreurs
    console.log('\n2️⃣ Vérification des livreurs...')
    const drivers = await prisma.deliveryPerson.findMany({
      where: { isActive: true },
      include: {
        pushTokens: {
          where: { isActive: true }
        },
        deliveryZones: {
          where: { isActive: true },
          select: { id: true, name: true }
        }
      }
    })

    console.log(`   👥 ${drivers.length} livreur(s) actif(s)`)
    drivers.forEach(driver => {
      const tokenCount = driver.pushTokens.length
      const zoneCount = driver.deliveryZones.length
      console.log(`   - ${driver.name}: ${tokenCount} token(s), ${zoneCount} zone(s)`)
      
      driver.deliveryZones.forEach(zone => {
        console.log(`     📍 Zone: ${zone.name}`)
      })
    })

    // 4. Créer un token de test si aucun n'existe
    if (activeTokens.length === 0 && drivers.length > 0) {
      console.log('\n3️⃣ Création d\'un token de test...')
      const testDriver = drivers[0]
      const testToken = `ExponentPushToken[DEV-TEST-${Date.now()}]`
      
      await prisma.deliveryPersonPushToken.create({
        data: {
          deliveryPersonId: testDriver.id,
          token: testToken,
          deviceId: 'test-device',
          platform: 'test',
          isActive: true,
        }
      })

      console.log(`   ✅ Token de test créé pour ${testDriver.name}`)
      console.log(`   📱 Token: ${testToken}`)
    }

    // 5. Statistiques finales
    console.log('\n4️⃣ Statistiques finales...')
    const finalStats = {
      totalTokens: await prisma.deliveryPersonPushToken.count({ where: { isActive: true } }),
      totalDrivers: await prisma.deliveryPerson.count({ where: { isActive: true } }),
      totalZones: await prisma.deliveryZone.count({ where: { isActive: true } }),
    }

    console.log(`   📊 ${finalStats.totalTokens} tokens actifs`)
    console.log(`   👥 ${finalStats.totalDrivers} livreurs actifs`)
    console.log(`   🗺️ ${finalStats.totalZones} zones actives`)

    console.log('\n✅ Test de base de données terminé avec succès !')

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
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
          { token: { startsWith: 'ExponentPushToken[DEV-TEST-' } },
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
  case undefined:
    testDatabase()
    break
  case 'cleanup':
    cleanupTestTokens()
    break
  default:
    console.log('Usage:')
    console.log('  node scripts/test-db-tokens.js test    # Tester la base de données')
    console.log('  node scripts/test-db-tokens.js cleanup # Nettoyer les tokens de test')
    break
}
