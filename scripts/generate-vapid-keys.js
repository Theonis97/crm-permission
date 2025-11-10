// Script pour générer de nouvelles clés VAPID
const webpush = require('web-push');

console.log('🔑 Génération de nouvelles clés VAPID...');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('\n✅ Clés VAPID générées avec succès !');
console.log('\n📋 Ajoutez ces variables à votre fichier .env :');
console.log('');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log('VAPID_EMAIL=admin@inotech-gabon.com');
console.log('');
console.log('📝 Copiez aussi ces clés dans le fichier .env.example');
console.log('');
console.log('🔄 Redémarrez le serveur backend après avoir mis à jour le .env');
