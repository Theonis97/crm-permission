/**
 * Service de notifications WhatsApp
 * Utilisé pour envoyer des alertes aux administrateurs
 */

const ADMIN_PHONE = '+24174820189'
const BOT_WHATSAPP_URL = process.env.BOT_WHATSAPP_URL || 'http://localhost:3001'
const BACKEND_API_KEY = process.env.BACKEND_API_KEY || ''

interface FailedOrderNotification {
  customerName: string | null
  customerPhone: string | null
  deliveryAddress: string | null
  totalAmount: number | null
  missingProducts: string[]
  failedOrderId: string
}

/**
 * Envoie une notification WhatsApp à l'admin pour une commande échouée
 */
export async function notifyAdminFailedOrder(data: FailedOrderNotification): Promise<void> {
  try {
    console.log('📱 Envoi notification WhatsApp admin pour commande échouée...')

    const message = formatFailedOrderMessage(data)
    
    // Envoyer le message via l'API du bot WhatsApp
    const success = await sendWhatsAppMessage(ADMIN_PHONE, message)
    
    if (success) {
      console.log('✅ Notification admin envoyée avec succès au', ADMIN_PHONE)
    } else {
      console.warn('⚠️ Échec de l\'envoi de la notification admin')
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de la notification WhatsApp:', error)
    // Ne pas bloquer le processus principal si la notification échoue
  }
}

/**
 * Formate le message de notification pour une commande échouée
 */
function formatFailedOrderMessage(data: FailedOrderNotification): string {
  const {
    customerName,
    customerPhone,
    deliveryAddress,
    totalAmount,
    missingProducts,
    failedOrderId
  } = data

  const message = `
🚨 *COMMANDE WHATSAPP ÉCHOUÉE* 🚨

❌ *Produit(s) non trouvé(s)*

👤 *Client:* ${customerName || 'Inconnu'}
📞 *Téléphone:* ${customerPhone || 'N/A'}
📍 *Adresse:* ${deliveryAddress || 'N/A'}
💰 *Montant:* ${totalAmount ? `${totalAmount.toLocaleString()} FCFA` : 'N/A'}

🛒 *Produits manquants:*
${missingProducts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

🔗 *ID Commande échouée:* ${failedOrderId}

⚠️ *Action requise:*
Veuillez corriger cette commande dans le dashboard:
👉 Dashboard > Delivery Map > Erreurs WhatsApp

---
_Message automatique du système CRM_
`.trim()

  return message
}

/**
 * Envoie un message WhatsApp générique à un numéro
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<boolean> {
  try {
    console.log(`📱 Envoi message WhatsApp vers ${phone}...`)
    
    const response = await fetch(`${BOT_WHATSAPP_URL}/api/send-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BACKEND_API_KEY}`
      },
      body: JSON.stringify({
        phone,
        message
      })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Erreur lors de l\'envoi')
    }
    
    console.log('✅ Message WhatsApp envoyé avec succès')
    return true
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message WhatsApp:', error)
    return false
  }
}
