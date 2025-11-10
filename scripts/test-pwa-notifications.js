// Script de test pour les notifications PWA
const { pwaPushNotificationService } = require('../lib/pwa-push-notifications');

async function testNotifications() {
  console.log('🧪 Test du service de notifications PWA');
  
  // 1. Vérifier les statistiques
  const stats = pwaPushNotificationService.getStats();
  console.log('📊 Statistiques:', stats);
  
  if (stats.totalSubscriptions === 0) {
    console.log('⚠️ Aucune subscription active. Ajoutons une subscription de test...');
    
    // Ajouter une subscription de test
    const testSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }
    };
    
    pwaPushNotificationService.addSubscription('test-driver-id', testSubscription);
    console.log('✅ Subscription de test ajoutée');
  }
  
  // 2. Test d'envoi de notification personnalisée
  try {
    console.log('📤 Test envoi notification personnalisée...');
    
    const result = await pwaPushNotificationService.sendNotificationToAllDrivers({
      title: '🧪 Test depuis le script',
      body: 'Ceci est un test depuis le backend',
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'TEST_SCRIPT',
        url: '/dashboard'
      }
    });
    
    console.log(`✅ Notification envoyée à ${result} livreur(s)`);
    
  } catch (error) {
    console.error('❌ Erreur test notification:', error);
  }
  
  // 3. Test notification nouvelle commande
  try {
    console.log('📤 Test notification nouvelle commande...');
    
    const result = await pwaPushNotificationService.notifyNewOrderToZone({
      orderNumber: 'CMD-TEST-' + Date.now(),
      customerName: 'Client Test',
      address: 'Libreville, Gabon',
      total: 15000
    });
    
    console.log(`✅ Notification nouvelle commande envoyée à ${result} livreur(s)`);
    
  } catch (error) {
    console.error('❌ Erreur test nouvelle commande:', error);
  }
}

// Exécuter le test
testNotifications().catch(console.error);
