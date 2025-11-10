// Script pour mettre à jour les clés VAPID dans le .env
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

// Nouvelles clés VAPID générées
const newVapidKeys = {
  publicKey: 'BAbLN5kqGt8rXv8NzKzDwDg_pAy8cLxSTTdjNbiCVQH0HacDkQZp7DCqTJu4XvBWDFPuwhbR8_g41S_nlzQAbFc',
  privateKey: 'y-6GrSppWokho3DqokirPby7FfmxvjsuMaWWzYn1VBg',
  email: 'admin@inotech-gabon.com'
};

try {
  let envContent = '';
  
  // Lire le fichier .env existant s'il existe
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('📖 Fichier .env existant lu');
  }

  // Fonction pour mettre à jour ou ajouter une variable
  function updateOrAddEnvVar(content, key, value) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    const newLine = `${key}=${value}`;
    
    if (regex.test(content)) {
      return content.replace(regex, newLine);
    } else {
      return content + (content.endsWith('\n') ? '' : '\n') + newLine + '\n';
    }
  }

  // Mettre à jour les clés VAPID
  envContent = updateOrAddEnvVar(envContent, 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', newVapidKeys.publicKey);
  envContent = updateOrAddEnvVar(envContent, 'VAPID_PRIVATE_KEY', newVapidKeys.privateKey);
  envContent = updateOrAddEnvVar(envContent, 'VAPID_EMAIL', newVapidKeys.email);

  // Écrire le fichier .env mis à jour
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Fichier .env mis à jour avec les nouvelles clés VAPID');
  console.log('');
  console.log('🔑 Clés VAPID configurées :');
  console.log(`📤 Public Key: ${newVapidKeys.publicKey.substring(0, 20)}...`);
  console.log(`🔒 Private Key: ${newVapidKeys.privateKey.substring(0, 20)}...`);
  console.log(`📧 Email: ${newVapidKeys.email}`);
  console.log('');
  console.log('🔄 Redémarrez le serveur backend pour appliquer les changements');
  
} catch (error) {
  console.error('❌ Erreur lors de la mise à jour du .env:', error);
}
