// Script pour vérifier la synchronisation des clés VAPID
require('dotenv').config();

function checkVapidConfiguration() {
  console.log('🔍 Vérification de la configuration VAPID');
  console.log('==========================================\n');

  // Vérifier les variables d'environnement
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  console.log('📋 Configuration Backend CRM:');
  console.log(`   Clé publique: ${publicKey ? '✅ ' + publicKey.substring(0, 30) + '...' : '❌ MANQUANTE'}`);
  console.log(`   Clé privée: ${privateKey ? '✅ ' + privateKey.substring(0, 20) + '...' : '❌ MANQUANTE'}`);
  console.log(`   Email VAPID: ${email ? '✅ ' + email : '❌ MANQUANT'}`);

  // Vérifier la validité des clés
  if (publicKey) {
    const isValidPublicKey = publicKey.length === 88 && publicKey.startsWith('B');
    console.log(`   Format clé publique: ${isValidPublicKey ? '✅ Valide' : '❌ Invalide'}`);
  }

  if (privateKey) {
    const isValidPrivateKey = privateKey.length === 43;
    console.log(`   Format clé privée: ${isValidPrivateKey ? '✅ Valide' : '❌ Invalide'}`);
  }

  console.log('\n📝 Instructions pour la PWA:');
  console.log('   1. Copier cette ligne dans le .env de la PWA:');
  console.log(`   NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey || 'MANQUANTE'}`);
  
  console.log('\n🔧 Actions requises:');
  if (!publicKey || !privateKey || !email) {
    console.log('   ❌ Configuration incomplète - Vérifiez votre .env');
    return false;
  } else {
    console.log('   ✅ Configuration complète');
    console.log('   📱 Synchronisez la clé publique avec la PWA');
    console.log('   🧹 Exécutez: node scripts/fix-vapid-subscriptions.js');
    return true;
  }
}

async function testVapidEndpoint() {
  console.log('\n🌐 Test de l\'endpoint VAPID');
  console.log('============================');

  try {
    const response = await fetch('http://localhost:3000/api/pwa/vapid-public-key');
    const data = await response.json();

    if (data.success && data.data?.publicKey) {
      const serverKey = data.data.publicKey;
      const envKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      console.log(`   Clé serveur: ${serverKey.substring(0, 30)}...`);
      console.log(`   Clé .env: ${envKey ? envKey.substring(0, 30) + '...' : 'MANQUANTE'}`);
      
      if (serverKey === envKey) {
        console.log('   ✅ Clés synchronisées');
      } else {
        console.log('   ❌ Clés différentes - Problème de synchronisation !');
      }
    } else {
      console.log('   ❌ Impossible de récupérer la clé depuis le serveur');
    }
  } catch (error) {
    console.log(`   ❌ Erreur de connexion: ${error.message}`);
    console.log('   💡 Assurez-vous que le serveur backend est démarré');
  }
}

async function main() {
  const configOk = checkVapidConfiguration();
  
  if (configOk) {
    await testVapidEndpoint();
  }

  console.log('\n📚 Documentation complète:');
  console.log('   📖 Voir: VAPID_KEYS_SYNC_FIX.md');
}

main().catch(console.error);
