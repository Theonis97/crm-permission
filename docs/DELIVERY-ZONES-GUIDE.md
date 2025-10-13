# Guide des Zones de Livraison

## 📍 Vue d'ensemble

Le système de zones de livraison permet de définir des zones géographiques sur une carte interactive et d'assigner des livreurs à ces zones.

## 🗺️ Fonctionnalités

### 1. Création de zones
- **Dessin sur carte interactive** : Cliquez sur différents points de la carte pour créer une zone
- **Minimum 3 points** : Triangle (3 points) ou polygone (4+ points, max 10)
- **Personnalisation** : Nom, couleur, frais de livraison, temps estimé
- **Assignment** : Assignez un livreur à chaque zone

### 2. Gestion des zones
- **Vue tableau** : Liste de toutes les zones avec détails
- **Vue carte** : Visualisation de toutes les zones sur la carte
- **Activation/Désactivation** : Activez ou désactivez une zone temporairement
- **Modification** : Éditez les détails ou redessinez la zone
- **Suppression** : Supprimez une zone

### 3. Assignation de livreurs
- Assignez un livreur à une ou plusieurs zones
- Le livreur assigné sera notifié des commandes dans sa zone
- Un livreur peut couvrir plusieurs zones

## 🚀 Utilisation

### Créer une zone

1. Allez sur `/dashboard/delivery-zones`
2. Cliquez sur **"Nouvelle zone"**
3. **Étape 1 - Dessiner la zone** :
   - Cliquez sur "Dessiner une zone"
   - Cliquez sur la carte pour placer des points (minimum 3)
   - La zone se forme automatiquement
   - Utilisez "Annuler dernier point" pour corriger
   - Cliquez sur "Terminer" quand la zone est complète

4. **Étape 2 - Détails** :
   - Nom de la zone (ex: "Centre-ville", "Zone Nord")
   - Couleur pour la visualisation
   - Frais de livraison en XAF
   - Temps de livraison estimé en minutes
   - Livreur assigné (optionnel)
   - Description de la couverture

5. Cliquez sur **"Créer la zone"**

### Modifier une zone

1. Dans le tableau, cliquez sur **"Actions" > "Modifier"**
2. Vous pouvez :
   - Redessiner la zone (retour à l'étape 1)
   - Modifier les détails uniquement
3. Sauvegardez les modifications

### Assigner un livreur

1. Lors de la création/modification d'une zone
2. Sélectionnez un livreur dans la liste déroulante
3. Le livreur verra les commandes de cette zone

### Activer/Désactiver une zone

1. **Actions > Activer/Désactiver**
2. Une zone désactivée n'accepte plus de commandes
3. Utile pour maintenance temporaire

## 📊 Données stockées

Pour chaque zone :
- **Coordonnées GPS** : Liste de points {lat, lng} formant le polygone
- **Centre calculé** : Latitude/Longitude du centre de la zone
- **Informations** : Nom, couleur, description
- **Tarification** : Frais de livraison, temps estimé
- **Assignment** : Livreur assigné
- **Statut** : Active/Inactive

## 🛠️ Technique

### Modèle de données (Prisma)

```prisma
model DeliveryZone {
  id                String   @id @default(cuid())
  storeId           String   
  name              String
  color             String   @default("#3B82F6")
  coordinates       Json     // Array de {lat, lng}
  centerLatitude    Float?   
  centerLongitude   Float?
  deliveryFee       Float    @default(0)
  estimatedTime     Int?     // minutes
  isActive          Boolean  @default(true)
  deliveryPersonId  String?  // Livreur assigné
  
  store             Store           
  deliveryPerson    DeliveryPerson? 
  orders            Order[]
}
```

### APIs disponibles

#### GET /api/delivery-zones
Récupère toutes les zones (filtrable par `storeId`)

#### POST /api/delivery-zones
Crée une nouvelle zone
```json
{
  "storeId": "xxx",
  "name": "Centre-ville",
  "color": "#3B82F6",
  "coordinates": [
    {"lat": 5.3600, "lng": 4.0083},
    {"lat": 5.3650, "lng": 4.0100},
    {"lat": 5.3620, "lng": 4.0150}
  ],
  "deliveryFee": 500,
  "estimatedTime": 30,
  "deliveryPersonId": "yyy"
}
```

#### PATCH /api/delivery-zones/[id]
Met à jour une zone

#### DELETE /api/delivery-zones/[id]
Supprime une zone

## 🗺️ Carte Interactive

### Bibliothèque utilisée
- **Leaflet** : Bibliothèque de cartes open-source
- **React-Leaflet** : Wrapper React pour Leaflet
- **OpenStreetMap** : Tuiles de carte gratuites

### Fonctionnalités de la carte
- Zoom/Pan
- Clic pour ajouter des points
- Visualisation en temps réel du polygone
- Couleurs personnalisées par zone
- Popup avec informations

### Centre par défaut
- **Douala, Cameroun** : Latitude 5.3600, Longitude 4.0083
- Modifiable dans le composant `DeliveryZoneMap`

## 💡 Bonnes pratiques

1. **Nommez clairement les zones** : Utilisez des noms descriptifs (quartiers, zones)
2. **Évitez les chevauchements** : Les zones ne doivent pas se chevaucher
3. **Assignez des livreurs** : Assurez-vous que chaque zone a un livreur
4. **Définissez des frais réalistes** : Basés sur la distance réelle
5. **Testez vos zones** : Vérifiez la couverture sur la carte

## 🔄 Intégration avec les commandes

Quand une commande est passée :
1. L'adresse du client est géolocalisée
2. Le système vérifie dans quelle zone elle se trouve
3. La zone détermine :
   - Les frais de livraison
   - Le livreur assigné
   - Le temps estimé

## 📝 Notes

- Les coordonnées sont stockées au format JSON dans PostgreSQL
- Le centre de la zone est calculé automatiquement
- Les zones peuvent être temporairement désactivées sans être supprimées
- Un livreur peut avoir plusieurs zones assignées
