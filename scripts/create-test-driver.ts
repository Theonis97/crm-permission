import { prisma } from '../lib/prisma';
import { createDeliveryPerson } from '../lib/delivery-person-helpers';

async function main() {
  console.log('🚀 Création d\'un livreur de test...\n');

  // Récupérer un magasin existant
  const store = await prisma.store.findFirst({
    where: { isActive: true },
  });

  if (!store) {
    console.error('❌ Aucun magasin actif trouvé. Créez d\'abord un magasin.');
    process.exit(1);
  }

  console.log(`📦 Magasin sélectionné : ${store.name}\n`);

  // Créer le livreur de test
  try {
    const deliveryPerson = await createDeliveryPerson({
      storeId: store.id,
      name: 'Test Livreur',
      phone: '+24106123456',
      email: 'test-livreur@inotech.com',
      password: 'password', // Mot de passe par défaut
      vehicle: 'Moto',
      plateNumber: 'LBV-123',
    });

    console.log('✅ Livreur créé avec succès !\n');
    console.log('📋 Informations de connexion :');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Email     : ${deliveryPerson.email}`);
    console.log(`Téléphone : ${deliveryPerson.phone}`);
    console.log(`Mot de passe : password`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🔐 Le livreur peut se connecter avec l\'email OU le téléphone');
    console.log('\n📱 Utilisez ces identifiants dans l\'app mobile pour tester.');

  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('\n❌ Erreur : Un livreur avec cet email ou téléphone existe déjà.');
      console.log('\n💡 Essayez de modifier l\'email ou le téléphone dans le script.');
    } else {
      console.error('\n❌ Erreur lors de la création du livreur :', error.message);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
