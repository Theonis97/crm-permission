import { prisma } from '../lib/prisma';

async function resetOrderStatus() {
  console.log('🔄 Remise de la commande en statut PENDING\n');

  const order = await prisma.storeOrder.update({
    where: {
      number: 'CMD-2025-000002',
    },
    data: {
      status: 'PENDING',
      deliveryPersonId: null,
      // On garde deliveryZoneId null pour tester le géocodage
    },
    select: {
      id: true,
      number: true,
      status: true,
      customerName: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
    },
  });

  console.log('✅ Commande remise à PENDING:');
  console.log(`   Numéro: ${order.number}`);
  console.log(`   Statut: ${order.status}`);
  console.log(`   Client: ${order.customerName}`);
  console.log(`   Coordonnées: ${order.deliveryLatitude}, ${order.deliveryLongitude}`);
  console.log('\n✅ La commande peut maintenant être acceptée depuis l\'app mobile');
}

resetOrderStatus()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
