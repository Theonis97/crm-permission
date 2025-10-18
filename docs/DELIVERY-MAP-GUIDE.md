# 🗺️ Carte Globale des Livraisons - Guide d'utilisation

## Vue d'ensemble

La **Carte des Livraisons** est une interface visuelle globale qui permet de superviser toutes les activités de livraison en temps réel.

## Accès

### Depuis le Dashboard
1. Cliquez sur le bouton **"Carte"** (📍) dans le header
2. Ou naviguez directement vers `/dashboard/delivery-map`

## Fonctionnalités

### 🎯 Vue Globale

La carte affiche **3 types d'éléments** :

#### 1. **Points de Commandes** 📦
- **Icône** : Pin bleu avec emoji 📦
- **Couleur** : Selon le statut
  - 🟠 Orange = PENDING (En attente)
  - 🔵 Bleu = CONFIRMED (Confirmée)
  - 🟣 Violet = PREPARING (En préparation)
  - 🟢 Vert = READY (Prête)
  - 🟣 Violet foncé = DELIVERING (En livraison)

**Informations au clic :**
- Numéro de commande
- Client (nom + téléphone)
- Adresse complète
- Montant total
- Statut actuel
- Zone de livraison
- Livreur assigné (si applicable)

#### 2. **Zones de Livraison** 🗺️
- **Affichage** : Polygones colorés
- **Transparence** : 20% de remplissage
- **Bordure** : 3px épaisseur
- **Couleur** : Unique pour chaque zone

**Informations au clic :**
- Nom de la zone
- Livreur assigné
- Frais de livraison
- Temps estimé
- Nombre de commandes actives dans cette zone

#### 3. **Livreurs Actifs** 🚚
- **Icône** : Camion orange 🚚
- **Position** : Centre de leur zone (pour l'instant)
- **Visibilité** : Seulement les livreurs actifs

**Informations au clic :**
- Nom du livreur
- Téléphone
- Zone assignée
- Liste des commandes en cours
  - Format : `CMD-123 (DELIVERING)`

## Filtres

### Filtrer par Zone
1. Cliquez sur le menu déroulant **"Filtrer par zone"**
2. Sélectionnez :
   - **"Toutes les zones"** : Affiche tout
   - **Nom de la zone spécifique** : Affiche uniquement cette zone

**Effet du filtre :**
- ✅ Affiche les commandes de la zone sélectionnée
- ✅ Affiche le polygone de la zone
- ✅ Affiche le livreur de cette zone
- ✅ Met à jour les statistiques

## Statistiques en Temps Réel

### Cartes de Statistiques (en haut)

1. **Commandes Actives** 📦
   - Total des commandes visibles
   - Nombre en attente (sous-total)

2. **En Livraison** 🚚
   - Commandes actuellement en cours de livraison
   - Commandes prêtes (sous-total)

3. **Zones Actives** 📍
   - Nombre de zones actives

4. **Livreurs Actifs** 🚚
   - Nombre de livreurs en service

## Interactions

### Navigation sur la Carte
- **Zoom** : Molette de la souris ou boutons +/-
- **Pan** : Cliquer-glisser
- **Centrage** : La carte se centre automatiquement sur tous les éléments

### Rafraîchir les Données
- Cliquez sur le bouton **"Actualiser"** (🔄)
- Les données se rechargent automatiquement

### Visualiser une Commande
1. Cliquez sur un **pin de commande**
2. Popup avec toutes les informations
3. Pour fermer : Cliquez ailleurs ou sur la croix

### Visualiser une Zone
1. Cliquez sur le **polygone d'une zone**
2. Popup avec les détails de la zone
3. Voir les statistiques de la zone

### Visualiser un Livreur
1. Cliquez sur l'**icône camion** 🚚
2. Popup avec les infos du livreur
3. Liste de ses commandes actives

## API Utilisée

### Endpoint
```
GET /api/delivery/map?zoneId={id}
```

**Paramètres :**
- `zoneId` (optionnel) : ID de la zone pour filtrer
  - Valeur spéciale : `"all"` = Toutes les zones

**Réponse :**
```json
{
  "success": true,
  "data": {
    "orders": [...],      // Commandes avec coordonnées
    "zones": [...],       // Zones avec polygones
    "drivers": [...],     // Livreurs avec positions
    "stats": {
      "totalOrders": 12,
      "pendingOrders": 5,
      "deliveringOrders": 3,
      "totalZones": 4,
      "activeDrivers": 3
    }
  }
}
```

## Règles de Visibilité

### Commandes Affichées
✅ Commandes avec statut :
- PENDING (En attente)
- CONFIRMED (Confirmée)
- PREPARING (En préparation)
- READY (Prête)
- DELIVERING (En livraison)

❌ Commandes **NON** affichées :
- DELIVERED (Déjà livrée)
- CANCELLED (Annulée)
- Commandes sans coordonnées

### Zones Affichées
✅ Zones actives (`isActive: true`)
✅ Zones avec polygone valide (min 3 points)

### Livreurs Affichés
✅ Livreurs actifs (`isActive: true`)
✅ Livreurs avec au moins une zone assignée
✅ Zone avec coordonnées de centre

## Légende Visuelle

| Élément | Icône/Couleur | Signification |
|---------|---------------|---------------|
| 📦 Pin bleu | Variable | Point de livraison d'une commande |
| 🚚 Camion orange | Orange (#ff6b35) | Position du livreur |
| Polygone coloré | Couleur de zone | Zone de livraison |
| Bordure épaisse | 3px | Délimitation de la zone |
| Remplissage léger | 20% opacité | Surface de la zone |

## Cas d'Usage

### 1. Dispatcher / Manager
**Objectif :** Superviser toutes les livraisons

**Actions :**
1. Ouvrir la carte globale
2. Voir toutes les commandes en attente (pins oranges)
3. Vérifier la répartition géographique
4. Identifier les zones surchargées
5. Assigner les commandes aux bons livreurs

### 2. Vérifier une Zone Spécifique
**Objectif :** Focus sur une zone

**Actions :**
1. Ouvrir la carte
2. Sélectionner la zone dans le filtre
3. Voir uniquement les commandes de cette zone
4. Vérifier le livreur assigné
5. Contrôler le nombre de commandes actives

### 3. Suivre un Livreur
**Objectif :** Voir l'activité d'un livreur

**Actions :**
1. Cliquer sur l'icône camion du livreur
2. Voir ses commandes en cours
3. Vérifier sa zone de travail
4. Contacter via le numéro affiché

## Améliorations Futures

### 🔮 Fonctionnalités Prévues

1. **Tracking GPS en Temps Réel**
   - Position GPS exacte des livreurs (via app mobile)
   - Mise à jour toutes les 30 secondes
   - Trajet en cours visible

2. **Statistiques Avancées**
   - Temps moyen de livraison par zone
   - Performance des livreurs
   - Heatmap des zones populaires

3. **Notifications en Temps Réel**
   - WebSocket pour mises à jour live
   - Alertes sur commandes urgentes
   - Notification de livraison complétée

4. **Optimisation des Routes**
   - Suggestion de routes optimales
   - Calcul du temps de trajet
   - Regroupement de commandes proches

5. **Historique**
   - Replay des livraisons passées
   - Analyse des performances
   - Export des rapports

## Performance

### Optimisations Implémentées
- ✅ Chargement dynamique de la carte (pas de SSR)
- ✅ Géocodage avec cache
- ✅ Coordonnées stockées en base
- ✅ Filtrage côté serveur

### Limitations Actuelles
- ⚠️ Position des livreurs = centre de zone (pas GPS réel)
- ⚠️ Pas de mise à jour automatique (manuel via bouton refresh)
- ⚠️ Maximum ~1000 commandes simultanées recommandé

## Troubleshooting

### La carte ne s'affiche pas
- Vérifier que `leaflet` et `react-leaflet` sont installés
- Vérifier la console pour les erreurs
- Rafraîchir la page

### Aucune commande visible
- Vérifier le filtre de zone
- S'assurer que les commandes ont des coordonnées
- Vérifier les statuts des commandes

### Les polygones ne s'affichent pas
- Vérifier que les zones ont des coordonnées valides
- Minimum 3 points requis pour un polygone
- Vérifier le champ `coordinates` en JSON

### Géocodage lent
- Les coordonnées sont mises en cache
- Après le premier géocodage, c'est instantané
- Nominatim a une limite de 1 req/sec

## Support

Pour toute question ou problème :
1. Consulter la console du navigateur
2. Vérifier les logs backend
3. Consulter `/docs/GEOLOCATION-ZONES.md` pour la géolocalisation

---

**Note :** Cette carte est un outil de supervision. Pour la gestion détaillée des commandes, utilisez les pages dédiées.
