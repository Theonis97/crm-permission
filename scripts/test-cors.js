// Script pour tester la configuration CORS du backend
const https = require('https');
const http = require('http');

const BACKEND_URL = 'http://192.168.1.115:3001';
const PWA_ORIGIN = 'http://192.168.1.115:3001';

async function testCorsOptions() {
  console.log('🔍 Test des requêtes CORS OPTIONS (preflight)');
  console.log('==============================================');
  
  const options = {
    hostname: 'inotech-gabon.com',
    port: 443,
    path: '/api/mobile/auth/me',
    method: 'OPTIONS',
    headers: {
      'Origin': PWA_ORIGIN,
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`✅ Status: ${res.statusCode}`);
      console.log('📋 Headers de réponse:');
      
      Object.entries(res.headers).forEach(([key, value]) => {
        if (key.toLowerCase().includes('access-control')) {
          console.log(`   ${key}: ${value}`);
        }
      });

      const allowOrigin = res.headers['access-control-allow-origin'];
      const allowMethods = res.headers['access-control-allow-methods'];
      const allowHeaders = res.headers['access-control-allow-headers'];

      console.log('\n🎯 Vérification CORS:');
      console.log(`   Origin autorisée: ${allowOrigin}`);
      console.log(`   Méthodes autorisées: ${allowMethods}`);
      console.log(`   Headers autorisés: ${allowHeaders}`);

      if (allowOrigin === PWA_ORIGIN || allowOrigin === '*') {
        console.log('✅ CORS configuré correctement !');
        resolve(true);
      } else {
        console.log(`❌ CORS mal configuré. Attendu: ${PWA_ORIGIN}, Reçu: ${allowOrigin}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('❌ Erreur de connexion:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function testCorsGet() {
  console.log('\n🔍 Test des requêtes CORS GET');
  console.log('=============================');
  
  const options = {
    hostname: 'inotech-gabon.com',
    port: 443,
    path: '/api/mobile/auth/me',
    method: 'GET',
    headers: {
      'Origin': PWA_ORIGIN,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`✅ Status: ${res.statusCode}`);
      
      const allowOrigin = res.headers['access-control-allow-origin'];
      console.log(`   Access-Control-Allow-Origin: ${allowOrigin}`);

      if (allowOrigin === PWA_ORIGIN || allowOrigin === '*') {
        console.log('✅ Requête GET CORS OK !');
        resolve(true);
      } else {
        console.log(`❌ Requête GET CORS échouée. Origin: ${allowOrigin}`);
        resolve(false);
      }
    });

    req.on('error', (error) => {
      console.error('❌ Erreur de connexion:', error.message);
      reject(error);
    });

    req.end();
  });
}

async function runTests() {
  try {
    console.log(`🚀 Test CORS Backend → PWA`);
    console.log(`Backend: ${BACKEND_URL}`);
    console.log(`PWA Origin: ${PWA_ORIGIN}\n`);

    const optionsResult = await testCorsOptions();
    const getResult = await testCorsGet();

    console.log('\n📊 Résumé des tests:');
    console.log(`   OPTIONS (preflight): ${optionsResult ? '✅' : '❌'}`);
    console.log(`   GET (requête): ${getResult ? '✅' : '❌'}`);

    if (optionsResult && getResult) {
      console.log('\n🎉 CORS configuré correctement ! La PWA devrait fonctionner.');
    } else {
      console.log('\n⚠️  Problème CORS détecté. Vérifiez la configuration du backend.');
      console.log('\n🔧 Actions recommandées:');
      console.log('   1. Redémarrer le backend après modification du middleware');
      console.log('   2. Vérifier que NODE_ENV=production sur le serveur');
      console.log('   3. Vider le cache du navigateur');
    }

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
  }
}

// Exécuter les tests
runTests();
