import webpush from 'web-push';

// Configuration VAPID (remplacez par vos clés)
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
  private subscriptions: Map<string, PWAPushSubscription> = new Map();

  /**
   * Ajouter une subscription pour un livreur
   */
  addSubscription(driverId: string, subscription: PWAPushSubscription) {
    this.subscriptions.set(driverId, subscription);
    console.log(`📱 PWA Subscription ajoutée pour le livreur ${driverId}`);
  }

  /**
   * Supprimer une subscription
   */
  removeSubscription(driverId: string) {
    this.subscriptions.delete(driverId);
    console.log(`📱 PWA Subscription supprimée pour le livreur ${driverId}`);
  }

  /**
   * Obtenir une subscription
   */
  getSubscription(driverId: string): PWAPushSubscription | undefined {
    return this.subscriptions.get(driverId);
  }

  /**
   * Envoyer une notification à un livreur spécifique
   */
  async sendNotificationToDriver(driverId: string, payload: NotificationPayload): Promise<boolean> {
    const subscription = this.getSubscription(driverId);
    
    if (!subscription) {
      console.warn(`❌ Aucune PWA subscription trouvée pour le livreur ${driverId}`);
      return false;
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      console.log(`✅ Notification PWA envoyée au livreur ${driverId}:`, payload.title);
      return true;
    } catch (error) {
      console.error(`❌ Erreur envoi notification PWA au livreur ${driverId}:`, error);
      
      // Si l'endpoint n'est plus valide, supprimer la subscription
      if (error instanceof Error && error.message.includes('410')) {
        this.removeSubscription(driverId);
      }
      
      return false;
    }
  }

  /**
   * Envoyer une notification à tous les livreurs connectés
   */
  async sendNotificationToAllDrivers(payload: NotificationPayload): Promise<number> {
    const results = await Promise.allSettled(
      Array.from(this.subscriptions.keys()).map(driverId => 
        this.sendNotificationToDriver(driverId, payload)
      )
    );

    const successCount = results.filter(result => 
      result.status === 'fulfilled' && result.value === true
    ).length;

    console.log(`📊 Notifications PWA envoyées: ${successCount}/${this.subscriptions.size}`);
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

    // Si des livreurs spécifiques sont ciblés
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

    // Sinon, envoyer à tous les livreurs connectés
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

    // Si des livreurs spécifiques sont ciblés
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

    // Sinon, envoyer à tous les livreurs connectés
    return await this.sendNotificationToAllDrivers(payload);
  }

  /**
   * Obtenir les statistiques des subscriptions
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.size,
      drivers: Array.from(this.subscriptions.keys())
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
