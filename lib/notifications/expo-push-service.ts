import { prisma } from '@/lib/prisma';

/**
 * Interface pour les données de notification
 */
export interface PushNotificationData {
  type: 'NEW_ORDER' | 'ORDER_UPDATED' | 'ORDER_CANCELLED' | 'ORDER_ASSIGNED';
  orderId: string;
  orderNumber: string;
  amount?: string;
  zone?: string;
  customerName?: string;
  action?: string;
}

/**
 * Interface pour un message Expo Push
 */
interface ExpoPushMessage {
  to: string | string[];
  sound?: 'default' | null;
  title?: string;
  body?: string;
  data?: PushNotificationData;
  priority?: 'default' | 'normal' | 'high';
  badge?: number;
  channelId?: string;
}

/**
 * Service d'envoi de notifications push via Expo
 */
export class ExpoPushService {
  private static readonly EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
  private static readonly MAX_TOKENS_PER_REQUEST = 100;

  /**
   * Envoyer une notification push à plusieurs tokens
   */
  static async sendPushNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<{ success: boolean; tickets: any[]; errors: string[] }> {
    try {
      if (tokens.length === 0) {
        console.warn('⚠️ Aucun token à envoyer');
        return { success: false, tickets: [], errors: ['Aucun token fourni'] };
      }

      console.log(`📤 Envoi de ${tokens.length} notifications push...`);

      // Filtrer les tokens valides
      const validTokens = tokens.filter(token => this.isValidExpoPushToken(token));

      if (validTokens.length === 0) {
        console.warn('⚠️ Aucun token valide trouvé');
        return { success: false, tickets: [], errors: ['Aucun token valide'] };
      }

      // Construire les messages
      const messages: ExpoPushMessage[] = validTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
      }));

      // Diviser en chunks de 100 (limite Expo)
      const chunks = this.chunkArray(messages, this.MAX_TOKENS_PER_REQUEST);
      const allTickets: any[] = [];
      const allErrors: string[] = [];

      for (const chunk of chunks) {
        try {
          const response = await fetch(this.EXPO_PUSH_ENDPOINT, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(chunk),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Erreur HTTP ${response.status}:`, errorText);
            allErrors.push(`HTTP ${response.status}: ${errorText}`);
            continue;
          }

          const result = await response.json();
          
          // Traiter les tickets
          if (result.data) {
            allTickets.push(...result.data);

            // Traiter les erreurs individuelles
            result.data.forEach((ticket: any, index: number) => {
              if (ticket.status === 'error') {
                console.error(`❌ Erreur pour token ${index}:`, ticket.message);
                allErrors.push(ticket.message);

                // Désactiver le token si invalide
                if (ticket.details?.error === 'DeviceNotRegistered') {
                  this.deactivateInvalidToken(chunk[index].to as string);
                }
              }
            });
          }

          console.log(`✅ Chunk de ${chunk.length} notifications envoyé`);
        } catch (chunkError) {
          console.error('❌ Erreur envoi chunk:', chunkError);
          allErrors.push(chunkError instanceof Error ? chunkError.message : String(chunkError));
        }
      }

      const successCount = allTickets.filter(t => t.status === 'ok').length;
      console.log(`✅ ${successCount}/${validTokens.length} notifications envoyées avec succès`);

      return {
        success: successCount > 0,
        tickets: allTickets,
        errors: allErrors,
      };
    } catch (error) {
      console.error('❌ Erreur envoi notifications push:', error);
      return {
        success: false,
        tickets: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Notifier un livreur spécifique
   */
  static async notifyDriver(
    driverId: string,
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<boolean> {
    try {
      // Récupérer les tokens actifs du livreur
      const tokens = await prisma.deliveryPersonPushToken.findMany({
        where: {
          deliveryPersonId: driverId,
          isActive: true,
        },
        select: {
          token: true,
        },
      });

      if (tokens.length === 0) {
        console.warn(`⚠️ Aucun token actif pour le livreur ${driverId}`);
        return false;
      }

      const tokenStrings = tokens.map((t: any) => t.token);
      const result = await this.sendPushNotifications(tokenStrings, title, body, data);

      return result.success;
    } catch (error) {
      console.error('❌ Erreur notification livreur:', error);
      return false;
    }
  }

  /**
   * Notifier tous les livreurs d'une zone
   */
  static async notifyDriversInZone(
    zoneId: string,
    title: string,
    body: string,
    data?: PushNotificationData
  ): Promise<boolean> {
    try {
      console.log(`📱 [PUSH] Envoi notifications pour zone ${zoneId}...`);

      // ✅ CORRECTION: Récupérer TOUS les livreurs actifs qui ont cette zone
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
            select: { token: true },
          },
        },
      });

      console.log(`📱 [PUSH] ${deliveryPersons.length} livreur(s) trouvé(s) pour la zone`);

      if (deliveryPersons.length === 0) {
        console.warn(`⚠️ Aucun livreur actif trouvé pour la zone ${zoneId}`);
        return false;
      }

      // Collecter tous les tokens de tous les livreurs
      const tokens: string[] = [];
      deliveryPersons.forEach((person: any  ) => {
        person.pushTokens.forEach((t: any) => {
          tokens.push(t.token);
        });
        console.log(`   - ${person.name}: ${person.pushTokens.length} token(s)`);
      });

      if (tokens.length === 0) {
        console.warn(`⚠️ Aucun token actif pour la zone ${zoneId}`);
        return false;
      }

      console.log(`📤 Envoi de ${tokens.length} notification(s) push...`);
      const result = await this.sendPushNotifications(tokens, title, body, data);

      if (result.success) {
        console.log(`✅ Notifications envoyées avec succès pour la zone ${zoneId}`);
      } else {
        console.error(`❌ Échec envoi notifications zone ${zoneId}:`, result.errors);
      }

      return result.success;
    } catch (error) {
      console.error('❌ Erreur notification zone:', error);
      return false;
    }
  }

  /**
   * Vérifier si un token Expo Push est valide
   */
  private static isValidExpoPushToken(token: string): boolean {
    return (
      token.startsWith('ExponentPushToken[') ||
      token.startsWith('ExpoPushToken[') ||
      token.startsWith('F[') // Pour les tokens Expo EAS
    );
  }

  /**
   * Désactiver un token invalide
   */
  private static async deactivateInvalidToken(token: string): Promise<void> {
    try {
      await prisma.deliveryPersonPushToken.updateMany({
        where: { token },
        data: { isActive: false },
      });
      console.log(`🗑️ Token invalide désactivé: ${token.substring(0, 20)}...`);
    } catch (error) {
      console.error('❌ Erreur désactivation token:', error);
    }
  }

  /**
   * Diviser un array en chunks
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Fonctions d'aide pour les notifications métier
 */

/**
 * Notifier une nouvelle commande
 */
export async function notifyNewOrder(
  driverId: string,
  orderNumber: string,
  amount: number,
  zone: string,
  customerName: string
): Promise<boolean> {
  return ExpoPushService.notifyDriver(
    driverId,
    '🚚 Nouvelle commande !',
    `Commande ${orderNumber} - ${amount.toLocaleString()} FCFA - ${customerName}`,
    {
      type: 'NEW_ORDER',
      orderId: '',
      orderNumber,
      amount: amount.toString(),
      zone,
      customerName,
      action: 'VIEW_ORDER',
    }
  );
}

/**
 * Notifier une assignation de commande
 */
export async function notifyOrderAssigned(
  driverId: string,
  orderId: string,
  orderNumber: string,
  amount: number
): Promise<boolean> {
  return ExpoPushService.notifyDriver(
    driverId,
    '📦 Nouvelle commande assignée',
    `Commande ${orderNumber} vous a été assignée - ${amount.toLocaleString()} FCFA`,
    {
      type: 'ORDER_ASSIGNED',
      orderId,
      orderNumber,
      amount: amount.toString(),
      action: 'VIEW_ORDER',
    }
  );
}

/**
 * Notifier un changement de statut de commande
 */
export async function notifyOrderStatusChange(
  driverId: string,
  orderId: string,
  orderNumber: string,
  newStatus: string
): Promise<boolean> {
  const statusLabels: Record<string, string> = {
    CONFIRMED: 'confirmée',
    DELIVERING: 'en livraison',
    DELIVERED: 'livrée',
    CANCELLED: 'annulée',
  };

  return ExpoPushService.notifyDriver(
    driverId,
    'Mise à jour commande',
    `Commande ${orderNumber} ${statusLabels[newStatus] || newStatus}`,
    {
      type: 'ORDER_UPDATED',
      orderId,
      orderNumber,
      action: 'VIEW_ORDER',
    }
  );
}
