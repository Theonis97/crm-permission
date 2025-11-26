// Script pour tester les notifications PWA lors de création de commandes POS
const API_BASE_URL = 'http://localhost:3000'; // Ajustez selon votre configuration

async function createTestOrder() {
  console.log('🧪 Test de création de commande POS avec notifications PWA');
  console.log('=========================================================');

  // Données de test pour une commande POS
  const testOrder = {
    storeId: "store-test-id", // Remplacez par un vrai ID de magasin
    customerName: "Test Client PWA",
    customerPhone: "+241 01 23 45 67",
    customerEmail: "test@example.com",
    deliveryAddress: "123 Rue de Test, Libreville",
    priority: "NORMAL",
    items: [
      {
        productId: "product-test-id", // Remplacez par un vrai ID de produit
        quantity: 2,
        unitPrice: 5000
      }
    ],
    notes: "Commande de test pour notifications PWA",
    paymentMethod: "CASH",
    deliveryFee: 1000
  };

  try {
    console.log('📤 Envoi de la commande de test...');
    
    const response = await fetch(`${API_BASE_URL}/api/store-orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Ajoutez ici vos headers d'authentification si nécessaire
        // 'Authorization': 'Bearer your-token'
      },
      body: JSON.stringify(testOrder)
    });

    if (response.ok) {
      const order = await response.json();
      console.log('✅ Commande créée avec succès !');
      console.log(`   ID: ${order.id}`);
      console.log(`   Numéro: ${order.number}`);
      console.log(`   Total: ${order.total} FCFA`);
      console.log(`   Client: ${order.customerName}`);
      
      console.log('\n📱 Vérifiez que les notifications PWA ont été envoyées dans les logs du serveur');
      console.log('   Recherchez les messages : "📱 Envoi notification PWA à tous les abonnés..."');
      
    } else {
      const error = await response.json();
      console.error('❌ Erreur lors de la création de la commande:', error);
    }

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  }
}

async function checkPWASubscriptions() {
  console.log('\n🔍 Vérification des abonnements PWA actifs');
  console.log('==========================================');

  try {
    const response = await fetch(`${API_BASE_URL}/api/pwa/debug`);
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Abonnements actifs: ${data.totalSubscriptions}`);
      console.log(`   Livreurs: ${data.drivers.join(', ') || 'Aucun'}`);
      
      if (data.totalSubscriptions === 0) {
        console.log('\n⚠️  Aucun abonnement PWA actif !');
        console.log('   Pour tester les notifications:');
        console.log('   1. Ouvrez http://169.254.154.216:3001');
        console.log('   2. Connectez-vous comme livreur');
        console.log('   3. Activez les notifications dans le header');
        console.log('   4. Relancez ce test');
      }
    } else {
      console.error('❌ Impossible de vérifier les abonnements PWA');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

async function runTests() {
  await checkPWASubscriptions();
  
  console.log('\n' + '='.repeat(60));
  console.log('⚠️  ATTENTION: Ce script nécessite des données valides');
  console.log('   Modifiez storeId et productId avec de vrais IDs');
  console.log('   Assurez-vous d\'être authentifié avec les bonnes permissions');
  console.log('='.repeat(60));
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  readline.question('\nVoulez-vous continuer avec la création de commande test ? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      createTestOrder().finally(() => readline.close());
    } else {
      console.log('Test annulé.');
      readline.close();
    }
  });
}

// Exécuter les tests
runTests();
