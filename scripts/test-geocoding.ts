import { geocodeAddress } from '../lib/geocoding';

async function testGeocoding() {
  console.log('🧪 Test du géocodage pour le Gabon\n');

  const testAddresses = [
    'Lenakiri, owendo',
    'Libreville, Gabon',
    'Akanda, Gabon',
    'Port-Gentil, Gabon',
  ];

  for (const address of testAddresses) {
    console.log(`\n📍 Test: "${address}"`);
    const result = await geocodeAddress(address);
    
    if (result.success && result.coordinates) {
      console.log(`   ✅ Succès!`);
      console.log(`   Coordonnées: ${result.coordinates.lat}, ${result.coordinates.lng}`);
    } else {
      console.log(`   ❌ Échec: ${result.error}`);
    }
    
    // Délai pour respecter la limite de Nominatim (1 req/sec)
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}

testGeocoding()
  .then(() => {
    console.log('\n✅ Tests terminés');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur:', error);
    process.exit(1);
  });
