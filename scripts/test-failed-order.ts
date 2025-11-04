import { readFileSync } from 'fs'
import { join } from 'path'

// Charger les variables d'environnement depuis .env
try {
  const envPath = join(__dirname, '../.env')
  const envFile = readFileSync(envPath, 'utf-8')
  
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
  console.log('✅ Fichier .env chargé')
} catch (error) {
  console.log('⚠️ Fichier .env non trouvé, utilisation des variables système')
}

/**
 * Script de test pour vérifier l'enregistrement des commandes échouées
 * Usage: npx tsx scripts/test-failed-order.ts
 */

async function testFailedOrder() {
  console.log('🧪 ======================================')
  console.log('🧪 TEST COMMANDE ÉCHOUÉE')
  console.log('🧪 ======================================\n')

  const API_URL = 'http://localhost:3000/api/orders/from-whatsapp'
  const API_KEY = process.env.BACKEND_API_KEY || 'your-api-key-here'
  
  console.log('🔑 BACKEND_API_KEY:', API_KEY ? `Définie (${API_KEY.substring(0, 10)}...)` : '❌ Non définie')
  console.log('')

  const testData = {
    customerName: "Test Client",
    phone: "066999888",
    deliveryAddress: "Owendo Test",
    totalAmount: 5000,
    products: [
      {
        productCode: "PRODUIT_INEXISTANT_123",
        quantity: 2,
        unitPrice: 2500
      }
    ],
    orderSource: "whatsapp",
    rawMessage: "Test Client\n2 PRODUIT_INEXISTANT_123\n5000\n066999888\nOwendo",
    senderId: "test@whatsapp",
    timestamp: new Date().toISOString()
  }

  console.log('📤 Envoi de la requête...')
  console.log('📦 Données:', JSON.stringify(testData, null, 2))
  console.log('')

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(testData)
    })

    const result = await response.json()

    console.log('📊 ======================================')
    console.log('📊 RÉSULTAT')
    console.log('📊 ======================================\n')
    console.log('Status:', response.status)
    console.log('Success:', result.success)
    
    if (!result.success) {
      console.log('❌ Erreur:', result.error)
      
      if (result.failedOrderId) {
        console.log('✅ Failed Order ID:', result.failedOrderId)
        console.log('✅ Message:', result.details?.message)
        console.log('✅ Produits manquants:', result.details?.missingProducts)
        console.log('')
        console.log('🎉 SUCCÈS: La commande échouée a été enregistrée!')
        
        // Vérifier dans la base
        console.log('\n📋 Vérification dans la base de données...')
        const checkResponse = await fetch(`http://localhost:3000/api/orders/failed-whatsapp?status=PENDING`)
        const checkData = await checkResponse.json()
        
        if (checkData.success) {
          console.log(`✅ ${checkData.count} commande(s) échouée(s) dans la base`)
          
          const found = checkData.data.find((o: any) => o.id === result.failedOrderId)
          if (found) {
            console.log('✅ Commande trouvée dans la base:')
            console.log('   - ID:', found.id)
            console.log('   - Client:', found.customerName)
            console.log('   - Produits manquants:', found.missingProducts)
            console.log('   - Statut:', found.status)
          }
        }
      } else {
        console.log('❌ ÉCHEC: Pas de failedOrderId retourné!')
        console.log('Réponse complète:', JSON.stringify(result, null, 2))
      }
    } else {
      console.log('⚠️ La commande a été créée normalement (pas d\'erreur)')
      console.log('Order ID:', result.orderId)
    }

  } catch (error) {
    console.error('❌ ======================================')
    console.error('❌ ERREUR FATALE')
    console.error('❌ ======================================')
    console.error(error)
  }

  console.log('\n🧪 ======================================')
  console.log('🧪 FIN DU TEST')
  console.log('🧪 ======================================')
}

// Lancer le test
testFailedOrder()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })
