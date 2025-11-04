/**
 * Service de géocodage et vérification de zone
 * Utilise Mapbox Geocoding API pour le géocodage d'adresses
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeocodingResult {
  success: boolean;
  coordinates?: Coordinates;
  error?: string;
}

/**
 * Géocode une adresse en utilisant Mapbox Geocoding API
 * Essaie plusieurs variantes de l'adresse si la première échoue
 * @param address L'adresse à géocoder
 * @returns Les coordonnées lat/lng ou une erreur
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult> {
  try {
    if (!address || address.trim().length === 0) {
      return {
        success: false,
        error: 'Adresse vide',
      };
    }

    // Lire la clé API au moment de l'exécution (pas au moment de l'import)
    const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''
    
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('❌ Clé API Mapbox manquante');
      console.error('❌ Valeur actuelle:', process.env.NEXT_PUBLIC_MAPBOX_TOKEN);
      return {
        success: false,
        error: 'Configuration Mapbox manquante',
      };
    }
    
    console.log('🔑 Clé Mapbox trouvée (longueur:', MAPBOX_ACCESS_TOKEN.length, 'caractères)');

    // Préparer plusieurs variantes de l'adresse à essayer
    const addressVariants = [];
    
    // Variante 1: Adresse complète + Gabon
    addressVariants.push(`${address}, Gabon`);
    
    // Variante 2: Extraire la ville si présente (après la virgule)
    const parts = address.split(',').map(p => p.trim());
    if (parts.length > 1) {
      // Essayer juste la ville/zone principale
      addressVariants.push(`${parts[parts.length - 1]}, Gabon`);
    }
    
    // Variante 3: Villes principales du Gabon si détectées
    const lowerAddress = address.toLowerCase();
    const gabonCities = ['libreville', 'port-gentil', 'owendo', 'akanda', 'franceville', 'oyem'];
    for (const city of gabonCities) {
      if (lowerAddress.includes(city)) {
        addressVariants.push(`${city}, Gabon`);
        break;
      }
    }

    console.log(`🔍 Tentatives de géocodage avec Mapbox pour: ${address}`);
    console.log(`   Variantes à essayer: ${addressVariants.length}`);

    // Essayer chaque variante jusqu'à en trouver une qui fonctionne
    for (let i = 0; i < addressVariants.length; i++) {
      const variant = addressVariants[i];
      console.log(`   ${i + 1}. Essai: "${variant}"`);
      
      const encodedAddress = encodeURIComponent(variant);
      // API Mapbox Geocoding : https://docs.mapbox.com/api/search/geocoding/
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=GA&limit=3`;

      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          console.log(`      ⚠️ Erreur HTTP ${response.status}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const result = data.features[0];
          const [lng, lat] = result.center; // Mapbox retourne [lng, lat]
          
          console.log(`      ✅ Trouvé: ${result.place_name}`);
          console.log(`      📍 Coordonnées: ${lat}, ${lng}`);
          console.log(`      📊 Pertinence: ${result.relevance}`);
          
          return {
            success: true,
            coordinates: {
              lat: lat,
              lng: lng,
            },
          };
        } else {
          console.log(`      ❌ Aucun résultat`);
        }
      } catch (fetchError) {
        console.log(`      ❌ Erreur réseau: ${fetchError}`);
        continue;
      }
      
      // Petit délai entre les requêtes (Mapbox n'a pas de limite stricte)
      if (i < addressVariants.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`❌ Échec du géocodage pour: ${address}`);
    return {
      success: false,
      error: 'Adresse introuvable. Vérifiez que l\'adresse est correcte et au Gabon.',
    };
  } catch (error) {
    console.error('❌ Erreur géocodage:', error);
    return {
      success: false,
      error: 'Erreur lors du géocodage',
    };
  }
}

/**
 * Vérifie si un point est à l'intérieur d'un polygone
 * Utilise l'algorithme Ray Casting (croisements de rayons)
 * @param point Le point à vérifier {lat, lng}
 * @param polygon Array de points définissant le polygone [{lat, lng}, ...]
 * @returns true si le point est dans le polygone
 */
export function isPointInPolygon(point: Coordinates, polygon: Coordinates[]): boolean {
  if (!polygon || polygon.length < 3) {
    return false; // Un polygone doit avoir au moins 3 points
  }

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Vérifie si une adresse est dans une zone de livraison
 * @param address L'adresse à vérifier
 * @param zonePolygon Le polygone de la zone [{lat, lng}, ...]
 * @returns true si l'adresse est dans la zone
 */
export async function isAddressInZone(
  address: string,
  zonePolygon: Coordinates[]
): Promise<{ inZone: boolean; coordinates?: Coordinates; error?: string }> {
  // Géocoder l'adresse
  const geocodingResult = await geocodeAddress(address);

  if (!geocodingResult.success || !geocodingResult.coordinates) {
    return {
      inZone: false,
      error: geocodingResult.error,
    };
  }

  // Vérifier si les coordonnées sont dans le polygone
  const inZone = isPointInPolygon(geocodingResult.coordinates, zonePolygon);

  return {
    inZone,
    coordinates: geocodingResult.coordinates,
  };
}

/**
 * Cache pour le géocodage (éviter les appels répétés)
 */
const geocodingCache = new Map<string, GeocodingResult>();

/**
 * Géocode une adresse avec mise en cache
 */
export async function geocodeAddressWithCache(address: string): Promise<GeocodingResult> {
  const cacheKey = address.toLowerCase().trim();
  
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey)!;
  }

  const result = await geocodeAddress(address);
  
  if (result.success) {
    geocodingCache.set(cacheKey, result);
  }

  return result;
}
