# Workflow des Commandes pour le Livreur

## 🎯 Règles de Gestion

### Règle #1 : Une seule commande active à la fois
Un livreur **ne peut avoir qu'UNE SEULE commande** en statut `CONFIRMED` ou `DELIVERING` à la fois.
- ✅ Il doit **terminer** sa commande actuelle avant d'en accepter une nouvelle
- ❌ Impossible d'accepter plusieurs commandes simultanément

### Règle #2 : Vérification géographique
Le livreur peut seulement accepter les commandes qui sont **physiquement dans sa zone de livraison**.
- Basé sur les **coordonnées GPS** de la commande
- Utilise l'algorithme **Point in Polygon** (Ray Casting)
- Indépendant du champ `deliveryZoneId` en base de données

---

## 📱 Écran Carte : Comportement

### Au chargement de la carte

**Si le livreur n'a PAS de commande active :**
- Affiche toutes les commandes PENDING de sa zone
- Le drawer reste fermé
- Peut cliquer sur n'importe quel marker pour voir les détails

**Si le livreur a une commande active (CONFIRMED ou DELIVERING) :**
- Le drawer s'ouvre **automatiquement** avec la commande active
- Affiche sa commande + historique (DELIVERED, CANCELLED)
- Masque les commandes PENDING des autres (non disponibles)

---

## 🔄 Cycle de Vie d'une Commande

```
┌─────────────┐
│  PENDING    │  ← Commande créée, en attente d'un livreur
│  (Orange)   │
└──────┬──────┘
       │
       │ [Livreur accepte] → Bouton "Accepter la commande"
       │
┌──────▼──────┐
│  CONFIRMED  │  ← Commande acceptée par le livreur
│  (Bleu)     │
└──────┬──────┘
       │
       │ [Livreur démarre] → Bouton "Commencer la livraison"
       │
┌──────▼──────┐
│ DELIVERING  │  ← Livreur en route vers le client
│  (Violet)   │
└──────┬──────┘
       │
       │ [Livreur livre] → Bouton "Marquer comme livrée"
       │
┌──────▼──────┐
│  DELIVERED  │  ← Commande livrée avec succès
│   (Vert)    │
└─────────────┘
```

---

## 🎨 Interface : Boutons d'Action

### Statut PENDING (Orange)
**Bouton affiché :** `Accepter la commande` (vert)
**Conditions :**
- ✅ Commande dans la zone du livreur (géographiquement)
- ✅ Livreur n'a pas de commande active
- ❌ Sinon : Message d'avertissement

**Avertissements possibles :**
- "Vous avez déjà une commande active (CMD-XXX). Terminez-la avant d'en accepter une nouvelle."
- "Cette commande n'est pas géographiquement dans votre zone de livraison."

### Statut CONFIRMED (Bleu)
**Bouton affiché :** `Commencer la livraison` (violet)
**Action :** Change le statut → DELIVERING
**Visible uniquement :** Si c'est la commande du livreur connecté

### Statut DELIVERING (Violet)
**Bouton affiché :** `Marquer comme livrée` (vert)
**Action :** Change le statut → DELIVERED
**Visible uniquement :** Si c'est la commande du livreur connecté

### Statut DELIVERED / CANCELLED
**Bouton affiché :** Aucun (information seulement)
**Message :** "Cette commande est livrée/annulée"

---

## 🗺️ Affichage sur la Carte

### Markers des commandes
- 📍 **Point bleu** : Commande PENDING (disponible)
- 📍 **Point orange** : Commande CONFIRMED (acceptée)
- 📍 **Point violet** : Commande DELIVERING (en livraison)
- 📍 **Point vert** : Commande DELIVERED (livrée)

### Polygones des zones
- 🔷 **Polygone coloré** : Zone de livraison avec sa couleur (ex: bleu pour Owendo)
- Les coordonnées du polygone définissent la zone géographique

### Marker du livreur
- 🚚 **Camion** : Position du livreur (centre de sa zone)

---

## 🔌 API : Endpoints

### GET `/api/delivery/driver-map?driverId={id}`

**Retourne :**
```json
{
  "success": true,
  "data": {
    "orders": [...],           // Commandes pertinentes
    "zones": [...],            // Zones actives
    "drivers": [...],          // Livreurs actifs
    "currentDriverZoneId": "...",  // Zone du livreur
    "activeOrder": {...} | null,   // Commande active du livreur
    "canAcceptNewOrders": true/false,  // Peut accepter de nouvelles commandes
    "stats": {...}
  }
}
```

**Logique des commandes retournées :**
- Si `driverId` fourni :
  - Ses commandes : CONFIRMED, DELIVERING, DELIVERED, CANCELLED
  - Commandes PENDING dans sa zone (disponibles)
- Si pas de `driverId` (mode dev) :
  - Toutes les commandes actives

### POST `/api/delivery/orders/{orderId}/accept`

**Body :**
```json
{
  "driverId": "...",  // ID du livreur (optionnel en dev)
  "zoneId": "..."     // ID de la zone
}
```

**Vérifications :**
1. ✅ Commande existe
2. ✅ Commande en statut PENDING
3. ✅ Livreur existe et est actif
4. ✅ **Livreur n'a PAS déjà une commande active** ⚠️

**Retourne :**
```json
{
  "success": true,
  "message": "Commande acceptée avec succès",
  "data": {
    "id": "...",
    "number": "CMD-XXX",
    "status": "CONFIRMED",
    "deliveryPerson": {...},
    "deliveryZone": {...}
  }
}
```

**Erreur si livreur déjà occupé :**
```json
{
  "success": false,
  "error": "Vous avez déjà une commande active (CMD-XXX)...",
  "activeOrder": {
    "id": "...",
    "number": "CMD-XXX",
    "status": "CONFIRMED"
  }
}
```

---

## 📊 Statistiques Affichées

### En haut de la carte (badges flottants)
- **Commandes** : Nombre total de commandes visibles
- **Livreurs** : Nombre de livreurs actifs
- **Zones** : Nombre de zones actives

### Stats détaillées (dans l'API)
```json
{
  "stats": {
    "totalOrders": 10,
    "pendingOrders": 3,
    "confirmedOrders": 2,
    "deliveringOrders": 1,
    "deliveredOrders": 4,
    "cancelledOrders": 0,
    "totalZones": 2,
    "activeDrivers": 5
  }
}
```

---

## 🔐 Sécurité et Authentification

### Mode Développement (actuel)
- `driverId` = `null`
- API utilise automatiquement la première zone avec un livreur
- Pas de vérification stricte

### Mode Production (à implémenter)
- Récupérer `driverId` depuis le contexte d'authentification
- Vérifier le token JWT
- Valider que le livreur est bien authentifié
- Limiter les actions aux commandes du livreur

**À implémenter :**
```typescript
// Dans l'app mobile
const { user } = useAuth();
const driverId = user?.id;

// Dans l'API
const token = request.headers.get('Authorization');
const userId = verifyToken(token);
```

---

## 🧪 Scénarios de Test

### Test 1 : Accepter une première commande
1. Ouvrir la carte (pas de commande active)
2. Cliquer sur une commande PENDING dans la zone
3. Vérifier : Bouton "Accepter" visible
4. Cliquer sur "Accepter"
5. ✅ Statut → CONFIRMED
6. ✅ Drawer se rouvre avec la commande
7. ✅ Bouton "Commencer la livraison" visible

### Test 2 : Impossible d'accepter une 2ème commande
1. Avoir une commande CONFIRMED
2. Cliquer sur une autre commande PENDING
3. ✅ Avertissement : "Vous avez déjà une commande active"
4. ✅ Bouton "Accepter" masqué

### Test 3 : Cycle complet de livraison
1. Accepter commande → CONFIRMED
2. "Commencer la livraison" → DELIVERING
3. "Marquer comme livrée" → DELIVERED
4. ✅ Peut maintenant accepter une nouvelle commande

### Test 4 : Commande hors zone
1. Cliquer sur une commande en dehors de la zone
2. ✅ Avertissement : "pas géographiquement dans votre zone"
3. ✅ Bouton "Accepter" masqué

---

## 📝 Notes Importantes

1. **Géocodage automatique** : Les commandes sans coordonnées sont géocodées automatiquement via OpenStreetMap
2. **Cache** : Les adresses géocodées sont mises en cache pour éviter les appels répétés
3. **Temps réel** : Les données se rechargent après chaque action
4. **Un seul actif** : Règle stricte côté API ET côté mobile
5. **Drawer auto** : S'ouvre automatiquement si commande active détectée

---

## 🚀 Améliorations Futures

1. **WebSocket** : Notifications en temps réel des nouvelles commandes
2. **Géolocalisation live** : Position GPS réelle du livreur en mouvement
3. **Navigation GPS** : Lancer Google Maps/Waze vers l'adresse
4. **Photos** : Photo de preuve de livraison
5. **Signature** : Signature numérique du client
6. **Chat** : Communication client-livreur
7. **Historique** : Voir toutes les livraisons du jour/semaine
8. **Optimisation** : Suggestion de route optimale pour plusieurs livraisons
