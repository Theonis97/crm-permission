import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk'
import { prisma } from './prisma'

// Créer une nouvelle instance du SDK Expo
const expo = new Expo()

export interface NotificationData {
  orderId: string
  orderNumber: string
  customerName: string
  deliveryAddress: string
  total: number
  zoneId: string
  zoneName: string
}

export class PushNotificationService {
  /**
   * Envoie une notification push à tous les livreurs d'une zone spécifique
   */
  static async sendNewOrderNotification(
    zoneId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      console.log(`📱 [PUSH] Début envoi notification pour zone ${zoneId}`)
      console.log(`📱 [PUSH] Données notification:`, notificationData)

      // Récupérer tous les livreurs actifs de cette zone avec leurs tokens
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
            where: {
              isActive: true,
            },
          },
        },
      })

      console.log(`📱 [PUSH] ${deliveryPersons.length} livreur(s) trouvé(s) pour la zone`)
      deliveryPersons.forEach(person => {
        console.log(`   - ${person.name}: ${person.pushTokens.length} token(s)`)
      })

      if (deliveryPersons.length === 0) {
        console.log(`⚠️ [PUSH] Aucun livreur actif trouvé pour la zone ${zoneId}`)
        return
      }

      // Collecter tous les tokens valides
      const pushTokens: string[] = []
      deliveryPersons.forEach(person => {
        person.pushTokens.forEach(tokenRecord => {
          const isDevToken = tokenRecord.token.startsWith('ExponentPushToken[DEV-')
          
          if (Expo.isExpoPushToken(tokenRecord.token) || isDevToken) {
            pushTokens.push(tokenRecord.token)
            if (isDevToken) {
              console.log(`🔧 Token de développement trouvé pour ${person.name}`)
            }
          } else {
            console.warn(`Token invalide pour ${person.name}: ${tokenRecord.token}`)
          }
        })
      })

      if (pushTokens.length === 0) {
        console.log(`⚠️ Aucun token push valide trouvé pour la zone ${zoneId}`)
        return
      }

      // Créer le message de notification
      const messages: ExpoPushMessage[] = pushTokens.map(token => ({
        to: token,
        sound: 'default',
        title: '🚚 Nouvelle commande disponible !',
        body: `Commande ${notificationData.orderNumber} - ${notificationData.customerName} (${notificationData.total}€)`,
        data: {
          type: 'NEW_ORDER',
          orderId: notificationData.orderId,
          orderNumber: notificationData.orderNumber,
          zoneId: notificationData.zoneId,
          zoneName: notificationData.zoneName,
        },
        badge: 1,
        priority: 'high',
        channelId: 'new-orders',
      }))

      // Séparer les tokens de développement des vrais tokens
      const realMessages = messages.filter(msg => !msg.to.startsWith('ExponentPushToken[DEV-'))
      const devMessages = messages.filter(msg => msg.to.startsWith('ExponentPushToken[DEV-'))

      const tickets: ExpoPushTicket[] = []

      // Envoyer les vraies notifications
      if (realMessages.length > 0) {
        const chunks = expo.chunkPushNotifications(realMessages)
        
        for (const chunk of chunks) {
          try {
            const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
            tickets.push(...ticketChunk)
          } catch (error) {
            console.error('Erreur envoi chunk notifications:', error)
          }
        }
      }

      // Simuler l'envoi pour les tokens de développement
      if (devMessages.length > 0) {
        console.log(`🔧 Simulation d'envoi pour ${devMessages.length} token(s) de développement`)
        devMessages.forEach(msg => {
          tickets.push({ status: 'ok', id: 'dev-' + Date.now() })
          console.log(`   📱 [DEV] ${msg.title} → ${msg.to.substring(0, 30)}...`)
        })
      }

      // Traiter les tickets pour identifier les tokens invalides
      await this.handlePushTickets(tickets, pushTokens)

      console.log(`✅ ${tickets.length} notifications envoyées pour la zone ${notificationData.zoneName}`)
    } catch (error) {
      console.error('Erreur service notification push:', error)
      throw error
    }
  }

  /**
   * Enregistre ou met à jour un token push pour un livreur
   */
  static async registerPushToken(
    deliveryPersonId: string,
    token: string,
    deviceId?: string,
    platform?: string
  ): Promise<void> {
    try {
      // Accepter les tokens de développement
      const isDevToken = token.startsWith('ExponentPushToken[DEV-')
      
      if (!Expo.isExpoPushToken(token) && !isDevToken) {
        throw new Error('Token push invalide')
      }

      if (isDevToken) {
        console.log('🔧 Enregistrement token de développement:', token.substring(0, 30) + '...')
      }

      // Vérifier si le token existe déjà
      const existingToken = await prisma.deliveryPersonPushToken.findUnique({
        where: { token },
      })

      if (existingToken) {
        // Mettre à jour le token existant
        await prisma.deliveryPersonPushToken.update({
          where: { token },
          data: {
            deliveryPersonId,
            deviceId,
            platform,
            isActive: true,
            lastUsedAt: new Date(),
          },
        })
      } else {
        // Créer un nouveau token
        await prisma.deliveryPersonPushToken.create({
          data: {
            deliveryPersonId,
            token,
            deviceId,
            platform,
            isActive: true,
          },
        })
      }

      console.log(`✅ Token push enregistré pour livreur ${deliveryPersonId}`)
    } catch (error) {
      console.error('Erreur enregistrement token push:', error)
      throw error
    }
  }

  /**
   * Désactive un token push
   */
  static async unregisterPushToken(token: string): Promise<void> {
    try {
      await prisma.deliveryPersonPushToken.updateMany({
        where: { token },
        data: { isActive: false },
      })
      console.log(`✅ Token push désactivé: ${token}`)
    } catch (error) {
      console.error('Erreur désactivation token push:', error)
      throw error
    }
  }

  /**
   * Traite les tickets de réponse pour identifier les tokens invalides
   */
  private static async handlePushTickets(
    tickets: ExpoPushTicket[],
    tokens: string[]
  ): Promise<void> {
    const invalidTokens: string[] = []

    tickets.forEach((ticket, index) => {
      if (ticket.status === 'error') {
        console.error(`Erreur ticket ${index}:`, ticket.message)
        
        // Si l'erreur indique un token invalide, le marquer pour suppression
        if (
          ticket.details?.error === 'DeviceNotRegistered' ||
          ticket.message?.includes('not registered') ||
          ticket.message?.includes('invalid')
        ) {
          invalidTokens.push(tokens[index])
        }
      }
    })

    // Désactiver les tokens invalides
    if (invalidTokens.length > 0) {
      await prisma.deliveryPersonPushToken.updateMany({
        where: {
          token: { in: invalidTokens },
        },
        data: { isActive: false },
      })
      console.log(`🗑️ ${invalidTokens.length} tokens invalides désactivés`)
    }
  }

  /**
   * Nettoie les anciens tokens inactifs (plus de 30 jours)
   */
  static async cleanupOldTokens(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await prisma.deliveryPersonPushToken.deleteMany({
        where: {
          isActive: false,
          updatedAt: { lt: thirtyDaysAgo },
        },
      })

      console.log(`🧹 ${result.count} anciens tokens supprimés`)
    } catch (error) {
      console.error('Erreur nettoyage tokens:', error)
    }
  }
}
