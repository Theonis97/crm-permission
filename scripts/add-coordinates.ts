import { prisma } from '../lib/prisma';

async function addCoordinates() {
  console.log('📍 Ajout des coordonnées GPS à la commande...\n');

  // Coordonnées approximatives pour Owendo, Gabon
  // Vous pouvez les ajuster selon la localisation exacte
  const owendoCoords = {
    lat: 0.344, // Centre approximatif d'Owendo
    lng: 9.511,
  };

  const order = await prisma.storeOrder.update({
    where: {
      number: 'CMD-2025-000002',
    },
    data: {
      deliveryLatitude: owendoCoords.lat,
      deliveryLongitude: owendoCoords.lng,
      // Optionnel: Assigner à une zone
      deliveryZoneId: 'cmgtq6e3r0001qk0k6gzuq2ay', // Zone Owendo
    },
    select: {
      id: true,
      number: true,
      customerName: true,
      deliveryAddress: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      deliveryZone: {
        select: {
          name: true,
          color: true,
        },
      },
    },
  });

  console.log('✅ Commande mise à jour:');
  console.log(`   Numéro: ${order.number}`);
  console.log(`   Client: ${order.customerName}`);
  console.log(`   Adresse: ${order.deliveryAddress}`);
  console.log(`   Coordonnées: Lat ${order.deliveryLatitude}, Lng ${order.deliveryLongitude}`);
  console.log(`   Zone: ${order.deliveryZone?.name || 'Non assignée'}`);
  console.log('\n✅ La commande devrait maintenant apparaître sur la carte!');
}

addCoordinates()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
