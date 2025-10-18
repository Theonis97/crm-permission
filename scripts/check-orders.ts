import { prisma } from '../lib/prisma';

async function checkOrders() {
  console.log('🔍 Vérification des commandes en attente...\n');

  // Toutes les commandes actives
  const allOrders = await prisma.storeOrder.findMany({
    where: {
      status: {
        in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
      },
    },
    select: {
      id: true,
      number: true,
      status: true,
      customerName: true,
      deliveryAddress: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      deliveryZoneId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`📦 Total commandes actives: ${allOrders.length}\n`);

  if (allOrders.length === 0) {
    console.log('❌ Aucune commande active trouvée dans la base de données');
    return;
  }

  allOrders.forEach((order, index) => {
    console.log(`\n${index + 1}. Commande ${order.number}`);
    console.log(`   ID: ${order.id}`);
    console.log(`   Statut: ${order.status}`);
    console.log(`   Client: ${order.customerName}`);
    console.log(`   Adresse: ${order.deliveryAddress || '❌ Non définie'}`);
    console.log(`   Coordonnées: ${order.deliveryLatitude && order.deliveryLongitude 
      ? `✅ Lat: ${order.deliveryLatitude}, Lng: ${order.deliveryLongitude}` 
      : '❌ Non définies'}`);
    console.log(`   Zone: ${order.deliveryZoneId || '❌ Non assignée'}`);
  });

  // Commandes sans coordonnées
  const ordersWithoutCoords = allOrders.filter(
    o => !o.deliveryLatitude || !o.deliveryLongitude
  );

  console.log(`\n\n⚠️  Commandes SANS coordonnées GPS: ${ordersWithoutCoords.length}`);
  console.log(`✅ Commandes AVEC coordonnées GPS: ${allOrders.length - ordersWithoutCoords.length}`);

  if (ordersWithoutCoords.length > 0) {
    console.log('\n💡 Pour afficher ces commandes sur la carte, vous devez:');
    console.log('   1. Ajouter une adresse de livraison');
    console.log('   2. Géocoder l\'adresse pour obtenir les coordonnées GPS');
    console.log('   3. Ou ajouter manuellement les coordonnées dans la base de données');
  }
}

checkOrders()
  .then(() => {
    console.log('\n✅ Vérification terminée');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
