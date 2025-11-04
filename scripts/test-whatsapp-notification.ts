/**
 * Script de test pour les notifications WhatsApp admin
 * Usage: npx tsx scripts/test-whatsapp-notification.ts
 */

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
  console.log('✅ Fichier .env chargé\n')
} catch (error) {
  console.log('⚠️ Fichier .env non trouvé, utilisation des variables système\n')
}

async function testWhatsAppNotification() {
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║   TEST NOTIFICATION WHATSAPP ADMIN             ║')
  console.log('╚════════════════════════════════════════════════╝\n')

  const BOT_WHATSAPP_URL = process.env.BOT_WHATSAPP_URL || 'http://localhost:3001'
  const BACKEND_API_KEY = process.env.BACKEND_API_KEY
  const ADMIN_PHONE = '+24174820189'

  console.log('🔧 Configuration:')
  console.log('   Bot WhatsApp URL:', BOT_WHATSAPP_URL)
  console.log('   API Key:', BACKEND_API_KEY ? '✅ Définie' : '❌ Non définie')
  console.log('   Admin Phone:', ADMIN_PHONE)
  console.log('')

  if (!BACKEND_API_KEY) {
    console.error('❌ BACKEND_API_KEY non définie dans .env')
    process.exit(1)
  }

  // Étape 1 : Vérifier que le bot est connecté
  console.log('📡 Étape 1: Vérification de la connexion du bot...')
  try {
    const statusResponse = await fetch(`${BOT_WHATSAPP_URL}/api/status`)
    const statusData = await statusResponse.json()

    console.log('   Status:', statusData.status)

    if (statusData.status !== 'connected') {
      console.error('❌ Bot WhatsApp non connecté!')
      console.log('   Veuillez démarrer le bot avec: cd bot-whatsapp && npm run web')
      process.exit(1)
    }

    console.log('✅ Bot connecté\n')
  } catch (error) {
    console.error('❌ Impossible de contacter le bot WhatsApp')
    console.error('   URL:', BOT_WHATSAPP_URL)
    console.error('   Erreur:', error)
    console.log('\n💡 Solution: Démarrez le bot avec: cd bot-whatsapp && npm run web')
    process.exit(1)
  }

  // Étape 2 : Envoyer un message de test
  console.log('📤 Étape 2: Envoi d\'un message de test...')
  
  const testMessage = `
🧪 *TEST NOTIFICATION SYSTÈME*

Ceci est un message de test pour vérifier que les notifications admin fonctionnent correctement.

⏰ Date: ${new Date().toLocaleString('fr-FR')}
🤖 Système: CRM Sambatech
✅ Si vous recevez ce message, les notifications fonctionnent!

---
_Message automatique de test_
`.trim()

  console.log('\n📨 Message à envoyer:')
  console.log('─────────────────────────────────────────')
  console.log(testMessage)
  console.log('─────────────────────────────────────────\n')

  try {
    const response = await fetch(`${BOT_WHATSAPP_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_API_KEY}`
      },
      body: JSON.stringify({
        phone: ADMIN_PHONE,
        message: testMessage
      })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      console.error('❌ Erreur lors de l\'envoi:')
      console.error('   Status:', response.status)
      console.error('   Erreur:', data.error || 'Inconnue')
      console.error('   Détails:', data.details || '')
      process.exit(1)
    }

    console.log('✅ Message envoyé avec succès!')
    console.log('   Destinataire:', data.sentTo || ADMIN_PHONE)
    console.log('')

  } catch (error: any) {
    console.error('❌ Erreur réseau:', error.message)
    process.exit(1)
  }

  // Étape 3 : Test de la notification complète de commande échouée
  console.log('📦 Étape 3: Test notification commande échouée...')
  
  const failedOrderMessage = `
🚨 *COMMANDE WHATSAPP ÉCHOUÉE* 🚨

❌ *Produit(s) non trouvé(s)*

👤 *Client:* Client Test
📞 *Téléphone:* 066999888
📍 *Adresse:* Libreville Centre
💰 *Montant:* 15,000 FCFA

🛒 *Produits manquants:*
1. Produit Test XYZ
2. Article Inexistant ABC

🔗 *ID Commande échouée:* test_${Date.now()}

⚠️ *Action requise:*
Veuillez corriger cette commande dans le dashboard:
👉 Dashboard > Delivery Map > Erreurs WhatsApp

---
_Message automatique du système CRM - TEST_
`.trim()

  try {
    const response = await fetch(`${BOT_WHATSAPP_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_API_KEY}`
      },
      body: JSON.stringify({
        phone: ADMIN_PHONE,
        message: failedOrderMessage
      })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      console.error('❌ Erreur lors de l\'envoi de la notification')
      console.error('   Erreur:', data.error || 'Inconnue')
      process.exit(1)
    }

    console.log('✅ Notification de commande échouée envoyée!')
    console.log('')

  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }

  // Résumé
  console.log('╔════════════════════════════════════════════════╗')
  console.log('║            ✅ TESTS RÉUSSIS                     ║')
  console.log('╚════════════════════════════════════════════════╝\n')

  console.log('📊 Résumé:')
  console.log('   ✅ Bot WhatsApp connecté')
  console.log('   ✅ Authentification API validée')
  console.log('   ✅ Message de test envoyé')
  console.log('   ✅ Notification commande échouée envoyée')
  console.log('')
  console.log('📱 Vérifiez votre WhatsApp au', ADMIN_PHONE)
  console.log('   Vous devriez avoir reçu 2 messages')
  console.log('')
  console.log('🎉 Le système de notifications est opérationnel!')
  console.log('')
}

// Lancer le test
testWhatsAppNotification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  })
