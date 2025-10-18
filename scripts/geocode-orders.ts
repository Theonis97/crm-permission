import { prisma } from '../lib/prisma';
import { geocodeAddress } from '../lib/geocoding';

async function geocodeOrders() {
  console.log('🔍 Géocodage des commandes sans coordonnées...\n');

  // Récupérer les commandes actives sans coordonnées
  const orders = await prisma.storeOrder.findMany({
    where: {
      status: {
        in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'],
      },
      deliveryAddress: { not: null },
      OR: [
        { deliveryLatitude: null },
        { deliveryLongitude: null },
      ],
    },
    select: {
      id: true,
      number: true,
      customerName: true,
      deliveryAddress: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
    },
  });

  console.log(`📦 Commandes trouvées: ${orders.length}\n`);

  if (orders.length === 0) {
    console.log('✅ Toutes les commandes ont déjà des coordonnées!');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const order of orders) {
    console.log(`\n🔍 Géocodage: ${order.number} - ${order.deliveryAddress}`);
    
    const result = await geocodeAddress(order.deliveryAddress!);
    
    if (result.success && result.coordinates) {
      console.log(`   ✅ Coordonnées trouvées: ${result.coordinates.lat}, ${result.coordinates.lng}`);
      
      // Mettre à jour la commande
      await prisma.storeOrder.update({
        where: { id: order.id },
        data: {
          deliveryLatitude: result.coordinates.lat,
          deliveryLongitude: result.coordinates.lng,
        },
      });
      
      successCount++;
    } else {
      console.log(`   ❌ Échec: ${result.error}`);
      failCount++;
    }
    
    // Respect de la limite Nominatim (1 req/sec)
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Succès: ${successCount}`);
  console.log(`❌ Échecs: ${failCount}`);
  console.log('='.repeat(50));
}

geocodeOrders()
  .then(() => {
    console.log('\n✅ Géocodage terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
