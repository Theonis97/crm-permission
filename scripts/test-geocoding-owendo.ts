import { geocodeAddress } from '../lib/geocoding'
import { readFileSync } from 'fs'
import { join } from 'path'

// Charger les variables d'environnement depuis .env
try {
  const envPath = join(__dirname, '../.env')
  const envFile = readFileSync(envPath, 'utf-8')
  
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
  console.log('✅ Fichier .env chargé')
} catch (error) {
  console.log('⚠️ Fichier .env non trouvé, utilisation des variables système')
}

/**
 * Script de test pour le géocodage d'une adresse
 * Usage: npx tsx scripts/test-geocoding-owendo.ts
 */

async function testGeocoding() {
  console.log('🔧 Variable NEXT_PUBLIC_MAPBOX_TOKEN:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? 'Définie ✅' : 'Non définie ❌')
  console.log('')
  const testAddress = "Owendo Seeg"
  
  console.log('🔍 ======================================')
  console.log('🔍 TEST DE GÉOCODAGE')
  console.log('🔍 ======================================')
  console.log('📍 Adresse à tester:', testAddress)
  console.log('⏱️  Début du test:', new Date().toISOString())
  console.log('')

  try {
    const result = await geocodeAddress(testAddress)

    console.log('')
    console.log('📊 ======================================')
    console.log('📊 RÉSULTAT DU GÉOCODAGE')
    console.log('📊 ======================================')
    
    if (result.success && result.coordinates) {
      console.log('✅ Statut: SUCCÈS')
      console.log('📍 Latitude:', result.coordinates.lat)
      console.log('📍 Longitude:', result.coordinates.lng)
      console.log('🗺️  Lien Google Maps:', `https://www.google.com/maps?q=${result.coordinates.lat},${result.coordinates.lng}`)
    } else {
      console.log('❌ Statut: ÉCHEC')
      console.log('❌ Erreur:', result.error)
    }

    console.log('')
    console.log('⏱️  Fin du test:', new Date().toISOString())
    console.log('🔍 ======================================')

  } catch (error) {
    console.error('')
    console.error('❌ ======================================')
    console.error('❌ ERREUR FATALE')
    console.error('❌ ======================================')
    console.error(error)
  }
}

// Lancer le test
testGeocoding()
  .then(() => {
    console.log('✅ Test terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur lors du test:', error)
    process.exit(1)
  })
