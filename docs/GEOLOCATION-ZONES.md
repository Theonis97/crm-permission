# 🗺️ Système de Géolocalisation des Zones de Livraison

## Vue d'ensemble

Le système utilise la **géolocalisation avancée** pour déterminer quelles commandes sont visibles par chaque livreur, basé sur des **polygones géographiques** définissant les zones de livraison.

## Comment ça fonctionne ?

### 1. Définition des Zones (Polygones)

Chaque `DeliveryZone` contient un champ `coordinates` qui est un **array de points** définissant un polygone :

```json
{
  "coordinates": [
    { "lat": 5.359952, "lng": -4.008256 },
    { "lat": 5.360123, "lng": -4.006789 },
    { "lat": 5.358456, "lng": -4.005234 },
    { "lat": 5.357890, "lng": -4.007123 },
    { "lat": 5.359952, "lng": -4.008256 }
  ]
}
```

⚠️ **Important** : Un polygone doit avoir au minimum **3 points** pour être valide.

### 2. Géocodage des Adresses

Lorsqu'une commande est créée avec une adresse de livraison :

1. **OpenStreetMap/Nominatim** est utilisé pour convertir l'adresse en coordonnées GPS (lat/lng)
2. Les coordonnées sont **stockées** dans `deliveryLatitude` et `deliveryLongitude`
3. Un **cache** est utilisé pour éviter de géocoder plusieurs fois la même adresse

### 3. Vérification Point-in-Polygon

L'algorithme **Ray Casting** vérifie si les coordonnées de l'adresse se trouvent à l'intérieur du polygone de la zone :

```
Point de livraison (lat, lng)
        ↓
    Polygone Zone
   ┌─────────────┐
   │      •      │ ← Point DEDANS = ✅
   │             │
   └─────────────┘
         •         ← Point DEHORS = ❌
```

## Règles de Visibilité des Commandes

### Pour un Livreur

Un livreur voit **UNIQUEMENT** :

1. ✅ **Les commandes qui LUI sont assignées** (tous statuts)
2. ✅ **Les commandes PENDING non assignées** dont l'adresse est **géographiquement** dans SA zone

### Commandes Invisibles

❌ Les commandes assignées à d'autres livreurs
❌ Les commandes dont l'adresse est hors de sa zone géographique

## Workflow Technique

### Récupération des Commandes (GET /api/mobile/orders)

```
1. Récupérer la zone du livreur avec son polygone
   ↓
2. Récupérer toutes les commandes PENDING non assignées
   ↓
3. Pour chaque commande :
   - Si coordonnées déjà stockées → Utiliser
   - Sinon → Géocoder l'adresse avec Nominatim
   - Sauvegarder les coordonnées
   ↓
4. Vérifier si les coordonnées sont dans le polygone
   ↓
5. Ne retourner que les commandes dans la zone
```

### Changement de Statut (PATCH /api/mobile/orders/[id]/status)

```
1. Vérifier si commande assignée au livreur → OK
   OU
2. Vérifier si commande dans la zone géographique :
   - Récupérer polygone de la zone
   - Géocoder l'adresse si nécessaire
   - Vérifier point-in-polygon
   ↓
3. Si OK → Permettre l'action (prendre la commande)
4. Sinon → Refuser avec message d'erreur
```

## Configuration des Zones

### Dans la Base de Données

```typescript
await prisma.deliveryZone.create({
  data: {
    storeId: "store-id",
    name: "Cocody",
    color: "#4CAF50",
    coordinates: [
      { lat: 5.359952, lng: -4.008256 },
      { lat: 5.360123, lng: -4.006789 },
      { lat: 5.358456, lng: -4.005234 },
      { lat: 5.357890, lng: -4.007123 },
      { lat: 5.359952, lng: -4.008256 }, // Fermer le polygone
    ],
    deliveryFee: 1000,
    estimatedTime: 30,
    isActive: true,
    deliveryPersonId: "livreur-id",
  },
});
```

### Outils pour Définir les Polygones

Vous pouvez utiliser ces outils pour dessiner vos zones :

1. **geojson.io** (https://geojson.io)
   - Dessinez votre zone
   - Exportez les coordonnées

2. **Google My Maps** (https://mymaps.google.com)
   - Créez une carte
   - Dessinez des polygones
   - Exportez en KML puis convertissez

3. **OpenStreetMap** avec éditeur
   - Identifiez les coordonnées des coins

## Avantages du Système

✅ **Précision géographique** : Plus de fausses détections par nom de quartier
✅ **Flexibilité** : Zones de forme complexe (pas seulement des cercles)
✅ **Performance** : Cache du géocodage + coordonnées stockées
✅ **Évolutivité** : Facile d'ajouter/modifier des zones
✅ **Visibilité claire** : Chaque livreur ne voit QUE ses commandes

## Logs de Debug

Le système produit des logs détaillés :

```
🔍 Vérification géographique de 5 commandes...
📍 Commande abc123: utilise coordonnées stockées
🌍 Géocodage de: Rue 10, Cocody, Abidjan
✅ Géocodage réussi: 5.359952, -4.008256
✅ Commande abc123 dans la zone Cocody
❌ Commande def456 hors zone Cocody
✓ 3 commandes dans la zone géographique
```

## Limitations

⚠️ **Nominatim Rate Limiting**
- Maximum 1 requête par seconde
- Le cache minimise les appels

⚠️ **Adresses imprécises**
- Si l'adresse est mal formatée, le géocodage peut échouer
- Solution : Stocker manuellement les coordonnées

⚠️ **Polygones complexes**
- Plus le polygone a de points, plus la vérification est coûteuse
- Recommandation : 4-12 points par zone

## Troubleshooting

### "Aucune commande visible"
1. Vérifier que la zone a un polygone valide (min 3 points)
2. Vérifier que les commandes ont une adresse
3. Regarder les logs du géocodage

### "Commande ne vous est pas assignée"
1. Vérifier que l'adresse est bien dans le polygone
2. Vérifier que la commande n'est pas assignée à un autre livreur
3. Regarder les logs de vérification géographique

### "Géocodage échoué"
1. Vérifier le format de l'adresse
2. Vérifier la connexion à Nominatim
3. Stocker manuellement les coordonnées dans la commande

## Performance

- **Cache de géocodage** : En mémoire pour la session
- **Coordonnées stockées** : Évite le géocodage répété
- **Requêtes optimisées** : Filtrage DB avant vérification géographique

## API Nominatim

URL utilisée : `https://nominatim.openstreetmap.org/search`

Paramètres :
- `q` : Adresse à géocoder
- `format=json` : Format de réponse
- `limit=1` : Une seule réponse
- `countrycodes=ci` : Limiter à la Côte d'Ivoire

Exemple :
```
https://nominatim.openstreetmap.org/search?q=Rue%2010%20Cocody%20Abidjan&format=json&limit=1&countrycodes=ci
```

## Conclusion

Ce système garantit que **chaque livreur ne voit que les commandes qui sont réellement dans sa zone géographique**, basé sur des calculs précis et non sur des approximations textuelles. 🎯
