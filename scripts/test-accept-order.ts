import { prisma } from '../lib/prisma';

async function testAcceptOrder() {
  console.log('🧪 Test de l\'acceptation de commande\n');

  // Trouver la commande en attente
  const order = await prisma.storeOrder.findFirst({
    where: {
      status: 'PENDING',
    },
    include: {
      deliveryPerson: true,
      deliveryZone: true,
    },
  });

  if (!order) {
    console.log('❌ Aucune commande en attente trouvée');
    return;
  }

  console.log(`📦 Commande: ${order.number}`);
  console.log(`   Statut actuel: ${order.status}`);
  console.log(`   Client: ${order.customerName}`);
  console.log(`   Livreur: ${order.deliveryPerson?.name || 'Non assigné'}`);
  console.log(`   Zone: ${order.deliveryZone?.name || 'Non assignée'}\n`);

  // Trouver un livreur actif (optionnel pour le test)
  const driver = await prisma.deliveryPerson.findFirst({
    where: {
      isActive: true,
    },
    include: {
      deliveryZones: {
        where: { isActive: true },
        take: 1,
      },
    },
  });

  console.log(`🚚 Livreur pour le test: ${driver?.name || 'Aucun'}`);
  if (driver?.deliveryZones[0]) {
    console.log(`   Zone: ${driver.deliveryZones[0].name}`);
  }

  // Simuler l'acceptation
  console.log('\n📝 Simulation de l\'acceptation...\n');

  const updatedOrder = await prisma.storeOrder.update({
    where: { id: order.id },
    data: {
      status: 'CONFIRMED',
      deliveryPersonId: driver?.id || null,
      deliveryZoneId: driver?.deliveryZones[0]?.id || null,
    },
    include: {
      deliveryPerson: true,
      deliveryZone: true,
    },
  });

  console.log('✅ Commande mise à jour:');
  console.log(`   Statut: ${updatedOrder.status}`);
  console.log(`   Livreur: ${updatedOrder.deliveryPerson?.name || 'Non assigné'}`);
  console.log(`   Zone: ${updatedOrder.deliveryZone?.name || 'Non assignée'}`);
  
  console.log('\n⚠️  Pour remettre en PENDING:');
  console.log(`   npx prisma studio`);
  console.log(`   Ou modifiez manuellement le statut`);
}

testAcceptOrder()
  .then(() => {
    console.log('\n✅ Test terminé');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
