// Script pour corriger les subscriptions PWA avec de mauvaises clés VAPID
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupInvalidSubscriptions() {
  console.log('🧹 Nettoyage des subscriptions PWA invalides');
  console.log('===============================================');

  try {
    // 1. Lister toutes les subscriptions actuelles
    const subscriptions = await prisma.pWAPushSubscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    console.log(`📊 Subscriptions actuelles: ${subscriptions.length}`);

    if (subscriptions.length === 0) {
      console.log('✅ Aucune subscription à nettoyer');
      return;
    }

    // 2. Afficher les détails des subscriptions
    subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. User: ${sub.user?.firstName} ${sub.user?.lastName} (${sub.user?.email})`);
      console.log(`   ID: ${sub.id}`);
      console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      console.log(`   Créée: ${sub.createdAt.toISOString()}`);
      console.log(`   User Agent: ${sub.userAgent || 'Non spécifié'}`);
    });

    // 3. Demander confirmation pour supprimer
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('\n❓ Voulez-vous supprimer TOUTES ces subscriptions ? (y/N): ', resolve);
    });

    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
      console.log('❌ Opération annulée');
      readline.close();
      return;
    }

    // 4. Supprimer toutes les subscriptions
    const deleteResult = await prisma.pWAPushSubscription.deleteMany({});
    
    console.log(`\n✅ ${deleteResult.count} subscription(s) supprimée(s)`);
    console.log('\n📋 Instructions pour les utilisateurs:');
    console.log('1. Ouvrir https://inotech-gabon.com');
    console.log('2. Se déconnecter puis se reconnecter');
    console.log('3. Cliquer sur l\'icône de notification dans le header');
    console.log('4. Autoriser les notifications (nouvelles clés VAPID)');
    console.log('\n🔑 Les nouvelles subscriptions utiliseront les bonnes clés VAPID');

    readline.close();

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkVapidKeys() {
  console.log('\n🔍 Vérification des clés VAPID');
  console.log('==============================');

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  console.log(`Clé publique: ${publicKey ? publicKey.substring(0, 20) + '...' : '❌ MANQUANTE'}`);
  console.log(`Clé privée: ${privateKey ? privateKey.substring(0, 20) + '...' : '❌ MANQUANTE'}`);
  console.log(`Email VAPID: ${email || '❌ MANQUANT'}`);

  if (!publicKey || !privateKey || !email) {
    console.log('\n⚠️ Configuration VAPID incomplète !');
    console.log('Vérifiez votre fichier .env');
    return false;
  }

  console.log('\n✅ Configuration VAPID complète');
  return true;
}

async function testNotificationSending() {
  console.log('\n🧪 Test d\'envoi de notification');
  console.log('================================');

  try {
    const response = await fetch('http://localhost:3000/api/pwa/test');
    const data = await response.json();

    if (data.success) {
      console.log(`✅ Test réussi: ${data.message}`);
      console.log(`📊 Notifications envoyées: ${data.data.notificationsSent}`);
    } else {
      console.log(`❌ Test échoué: ${data.error}`);
    }
  } catch (error) {
    console.log(`❌ Erreur test: ${error.message}`);
  }
}

async function main() {
  console.log('🔧 Outil de réparation des notifications PWA');
  console.log('==============================================\n');

  // 1. Vérifier la configuration VAPID
  const vapidOk = await checkVapidKeys();
  if (!vapidOk) {
    process.exit(1);
  }

  // 2. Nettoyer les anciennes subscriptions
  await cleanupInvalidSubscriptions();

  // 3. Tester l'envoi de notifications
  console.log('\n⏳ Attente de 5 secondes avant le test...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await testNotificationSending();

  console.log('\n🎉 Processus terminé !');
  console.log('Les utilisateurs doivent maintenant se réabonner aux notifications.');
}

// Exécuter le script
main().catch(console.error);
