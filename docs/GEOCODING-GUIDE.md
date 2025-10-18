# Guide du Géocodage Automatique

## 🎯 Fonctionnalité

L'API `/api/delivery/driver-map` géocode **automatiquement** toutes les commandes qui ont une adresse de livraison mais pas de coordonnées GPS.

## 🔄 Comment ça fonctionne

1. **Récupération des commandes** : L'API récupère toutes les commandes actives avec une adresse
2. **Détection** : Pour chaque commande sans coordonnées GPS (latitude/longitude NULL)
3. **Géocodage** : Appel à l'API OpenStreetMap/Nominatim avec l'adresse
4. **Filtrage Gabon** : Priorité aux résultats situés au Gabon (code pays: `ga`)
5. **Sauvegarde** : Les coordonnées trouvées sont automatiquement sauvegardées dans la base de données
6. **Affichage** : La commande apparaît ensuite sur la carte mobile

## 📍 Format des adresses

Pour de meilleurs résultats, les adresses doivent inclure :
- Le quartier ou la zone
- La ville
- Optionnel : "Gabon" (ajouté automatiquement)

**Exemples d'adresses valides :**
- ✅ `Lenakiri, Owendo`
- ✅ `Quartier Glass, Libreville`
- ✅ `Boulevard Triomphal, Libreville`
- ✅ `Akanda`
- ❌ `Chez Paul` (trop vague)

## 🔧 Configuration

### Fichier: `lib/geocoding.ts`

```typescript
const url = `https://nominatim.openstreetmap.org/search?q=${encodedAddress}&format=json&limit=3&countrycodes=ga`;
```

- `limit=3` : Récupère 3 résultats maximum
- `countrycodes=ga` : Limite la recherche au Gabon
- Filtre supplémentaire sur `country_code` et `display_name`

### Cache

Le géocodage utilise un cache en mémoire pour éviter les appels répétés à l'API Nominatim :
- Même adresse = résultat en cache
- Pas de limite de requêtes atteinte

## ⚡ Performance

- **Première fois** : ~1-2 secondes par adresse (appel API)
- **Appels suivants** : Instantané (cache)
- **Limite Nominatim** : 1 requête par seconde (respectée automatiquement)

## 🧪 Tester le géocodage

```bash
# Tester quelques adresses
npx tsx scripts/test-geocoding.ts

# Vérifier une commande spécifique
npx tsx scripts/check-orders.ts
```

## 📱 Sur l'application mobile

Quand le livreur ouvre la carte :
1. L'API vérifie toutes les commandes
2. Géocode automatiquement celles sans coordonnées
3. Sauvegarde les coordonnées en DB
4. Retourne toutes les commandes avec leurs positions
5. Affiche les markers sur la carte

## ⚠️ Limitations

### API Nominatim (OpenStreetMap)
- Limite : **1 requête par seconde**
- Usage gratuit limité
- Nécessite un User-Agent

### Solutions pour la production
1. **Géocodage lors de la création** : Géocoder au moment de créer la commande
2. **Service payant** : Google Maps Geocoding API, Mapbox, etc.
3. **Base de données locale** : Pré-géocoder les zones connues

## 🔐 Sécurité

L'API `/api/delivery/driver-map` est **publique** (pas d'authentification) pour permettre l'accès depuis l'application mobile.

Pour la production, ajouter :
- Token d'authentification
- Vérification de l'ID du livreur
- Rate limiting

## 📊 Monitoring

Les logs dans la console du serveur montrent :
```
🔍 Géocodage de l'adresse: Lenakiri, owendo
✅ Coordonnées trouvées: 0.344, 9.511
```

## 🐛 Problèmes courants

### Adresse non trouvée
**Cause** : Adresse trop vague ou inexistante dans OpenStreetMap
**Solution** : Améliorer la description de l'adresse

### Coordonnées hors Gabon
**Cause** : Mauvaise correspondance de l'adresse
**Solution** : Le filtre `countrycodes=ga` limite déjà les résultats

### Trop de requêtes
**Cause** : Dépassement de la limite Nominatim
**Solution** : Le cache évite ce problème pour les adresses répétées

## 🚀 Prochaines étapes

1. Ajouter un bouton dans le CRM pour géocoder manuellement
2. Afficher un indicateur visuel (commande géocodée ou non)
3. Permettre la correction manuelle des coordonnées
4. Intégrer un service de géocodage payant pour plus de fiabilité
