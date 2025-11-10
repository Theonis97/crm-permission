import webpush from 'web-push';
import { prisma } from './prisma';

// Configuration VAPID
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BbS9YS7_aqIaOWX8r9AUfQ1No_ZXJpqVLRaXvlkHVgeCNjjhMGPjjJQ';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'aUWqaB3S2d6KAeDbEUBm3aCOBpXgdDCcu_-bjHmTBJU';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@inotech-gabon.com';

// Configuration web-push
webpush.setVapidDetails(
  `mailto:${VAPID_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export interface PWAPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class PWAPushNotificationService {
  /**
   * Ajouter ou mettre à jour une subscription pour un livreur
   */
  async addSubscription(userId: string, subscription: PWAPushSubscription, userAgent?: string) {
    try {
      await prisma.pWAPushSubscription.upsert({
        where: { userId },
        update: {
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent: userAgent || null,
          isActive: true,
          updatedAt: new Date()
        },
        create: {
          userId,
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          userAgent: userAgent || null,
          isActive: true
        }
      });
      
      console.log(`📱 PWA Subscription sauvegardée pour l'utilisateur ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur sauvegarde subscription pour ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer une subscription
   */
  async removeSubscription(userId: string) {
    try {
      await prisma.pWAPushSubscription.updateMany({
        where: { userId },
        data: { isActive: false }
      });
      
      console.log(`📱 PWA Subscription désactivée pour l'utilisateur ${userId}`);
    } catch (error) {
      console.error(`❌ Erreur suppression subscription pour ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir une subscription
   */
  async getSubscription(userId: string): Promise<PWAPushSubscription | null> {
    try {
      const dbSubscription = await prisma.pWAPushSubscription.findFirst({
        where: { 
          userId,
          isActive: true
        }
      });

      if (!dbSubscription) {
        return null;
      }

      return {
        endpoint: dbSubscription.endpoint,
        keys: {
          p256dh: dbSubscription.p256dhKey,
          auth: dbSubscription.authKey
        }
      };
    } catch (error) {
      console.error(`❌ Erreur récupération subscription pour ${userId}:`, error);
      return null;
    }
  }

  /**
   * Obtenir toutes les subscriptions actives
   */
  async getAllActiveSubscriptions(): Promise<Array<{ userId: string; subscription: PWAPushSubscription }>> {
    try {
      const dbSubscriptions = await prisma.pWAPushSubscription.findMany({
        where: { isActive: true }
      });

      return dbSubscriptions.map(db => ({
        userId: db.userId,
        subscription: {
          endpoint: db.endpoint,
          keys: {
            p256dh: db.p256dhKey,
            auth: db.authKey
          }
        }
      }));
    } catch (error) {
      console.error('❌ Erreur récupération toutes les subscriptions:', error);
      return [];
    }
  }

  /**
   * Envoyer une notification à un livreur spécifique
   */
  async sendNotificationToDriver(userId: string, payload: NotificationPayload): Promise<boolean> {
    const subscription = await this.getSubscription(userId);
    
    if (!subscription) {
      console.warn(`❌ Aucune PWA subscription trouvée pour l'utilisateur ${userId}`);
      return false;
    }

    // Vérifier si c'est une subscription de test
    if (subscription.endpoint.includes('test-endpoint')) {
      console.log(`🧪 Simulation envoi notification à l'utilisateur de test ${userId}:`, payload.title);
      return true;
    }

    try {
      console.log(`📤 Envoi notification PWA à l'utilisateur ${userId}...`);
      console.log(`🔗 Endpoint:`, subscription.endpoint);
      
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`✅ Notification PWA envoyée à l'utilisateur ${userId}:`, payload.title);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi notification PWA à l'utilisateur ${userId}:`, error);
      
      if (error instanceof Error && (error.message.includes('410') || error.message.includes('invalid'))) {
        console.log(`🗑️ Suppression subscription invalide pour ${userId}`);
        await this.removeSubscription(userId);
      }
      
      return false;
    }
  }

  /**
   * Envoyer une notification à tous les livreurs connectés
   */
  async sendNotificationToAllDrivers(payload: NotificationPayload): Promise<number> {
    const activeSubscriptions = await this.getAllActiveSubscriptions();
    
    const results = await Promise.allSettled(
      activeSubscriptions.map(({ userId }) => 
        this.sendNotificationToDriver(userId, payload)
      )
    );

    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`📊 Notifications PWA envoyées: ${successCount}/${activeSubscriptions.length}`);
    return successCount;
  }

  /**
   * Envoyer notification de nouvelle commande aux livreurs d'une zone
   */
  async notifyNewOrderToZone(orderData: {
    orderNumber: string;
    customerName: string;
    address: string;
    total: number;
    zoneId?: string;
  }, targetDriverIds?: string[]): Promise<number> {
    const payload: NotificationPayload = {
      title: '🚚 Nouvelle commande disponible !',
      body: `Commande ${orderData.orderNumber} - ${orderData.customerName}\n📍 ${orderData.address}\n💰 ${orderData.total.toLocaleString()} FCFA`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        type: 'NEW_ORDER',
        orderId: orderData.orderNumber,
        zoneId: orderData.zoneId,
        url: '/dashboard/map'
      },
      actions: [
        {
          action: 'view',
          title: 'Voir la commande',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ]
    };

    if (targetDriverIds && targetDriverIds.length > 0) {
      const results = await Promise.allSettled(
        targetDriverIds.map(driverId => this.sendNotificationToDriver(driverId, payload))
      );
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      console.log(`📊 Notifications PWA envoyées à ${successCount}/${targetDriverIds.length} livreurs ciblés`);
      return successCount;
    }

    return await this.sendNotificationToAllDrivers(payload);
  }

  /**
   * Envoyer notification de commande urgente
   */
  async notifyUrgentOrderToZone(orderData: {
    orderNumber: string;
    customerName: string;
    address: string;
    total: number;
    zoneId?: string;
  }, targetDriverIds?: string[]): Promise<number> {
    const payload: NotificationPayload = {
      title: '🚨 COMMANDE URGENTE !',
      body: `URGENT - ${orderData.orderNumber}\n${orderData.customerName}\n📍 ${orderData.address}\n💰 ${orderData.total.toLocaleString()} FCFA`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        type: 'URGENT_ORDER',
        orderId: orderData.orderNumber,
        zoneId: orderData.zoneId,
        url: '/dashboard/map'
      },
      actions: [
        {
          action: 'accept',
          title: 'Accepter',
          icon: '/icons/accept-icon.png'
        },
        {
          action: 'view',
          title: 'Voir détails'
        }
      ]
    };

    if (targetDriverIds && targetDriverIds.length > 0) {
      const results = await Promise.allSettled(
        targetDriverIds.map(driverId => this.sendNotificationToDriver(driverId, payload))
      );
      
      const successCount = results.filter(result => 
        result.status === 'fulfilled' && result.value === true
      ).length;
      
      console.log(`📊 Notifications PWA urgentes envoyées à ${successCount}/${targetDriverIds.length} livreurs ciblés`);
      return successCount;
    }

    return await this.sendNotificationToAllDrivers(payload);
  }

  /**
   * Obtenir les statistiques des subscriptions
   */
  async getStats() {
    const activeSubscriptions = await this.getAllActiveSubscriptions();
    return {
      totalSubscriptions: activeSubscriptions.length,
      drivers: activeSubscriptions.map(sub => sub.userId)
    };
  }

  /**
   * Générer les clés VAPID (à utiliser une seule fois)
   */
  static generateVapidKeys() {
    return webpush.generateVAPIDKeys();
  }
}

// Instance singleton
export const pwaPushNotificationService = new PWAPushNotificationService();

// Export des clés publiques pour le frontend
export const VAPID_KEYS = {
  publicKey: VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY
};

export default pwaPushNotificationService;
