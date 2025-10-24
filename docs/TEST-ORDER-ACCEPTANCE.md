# Guide de Test : Acceptation de Commande par le Livreur

## 🎯 Objectif
Tester le flux complet d'acceptation d'une commande depuis l'application mobile du livreur.

---

## 📋 Prérequis

1. **Backend démarré** sur le port 3000
   ```bash
   cd crm-sambatech
   npm run dev
   ```

2. **App mobile démarrée**
   ```bash
   cd inotech-driver
   npm start
   ```

3. **Commande en statut PENDING** avec coordonnées GPS

---

## 🔄 Étape 1 : Préparer une commande de test

Si la commande a déjà été acceptée, la remettre en PENDING :

```bash
cd crm-sambatech
npx tsx scripts/reset-order-status.ts
```

**Résultat attendu :**
```
✅ Commande remise à PENDING:
   Numéro: CMD-2025-000002
   Statut: PENDING
   Client: Michel Norbert
   Coordonnées: 0.3208235, 9.4952738
```

---

## 🧪 Étape 2 : Tester l'API directement (optionnel)

Tester l'endpoint avec curl :

```bash
cd crm-sambatech
chmod +x scripts/test-api-accept.sh
./scripts/test-api-accept.sh
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Commande acceptée avec succès",
  "data": {
    "id": "cmguc6iy60001sbquvkcbf6cq",
    "number": "CMD-2025-000002",
    "status": "CONFIRMED",
    "deliveryPerson": {
      "id": "cmgtqa3fs0003qk0ke47lp00a",
      "name": "Jean Dupoont",
      "phone": "+24177808864"
    },
    "deliveryZone": {
      "id": "cmgtq6e3r0001qk0k6gzuq2ay",
      "name": "Owendo",
      "color": "#3B82F6"
    }
  }
}
```

Si l'API fonctionne, **remettre la commande en PENDING** avant de tester sur mobile.

---

## 📱 Étape 3 : Tester sur l'application mobile

### 1. Ouvrir l'app mobile
- Lancez l'app sur simulateur/appareil
- Allez sur l'onglet **"Carte"**

### 2. Vérifier que les données se chargent
Logs console attendus :
```
Fetching from: http://https://crm.sambatechpro.com':3000/api/delivery/driver-map
Map data received: {orders: Array(1), zones: Array(2), ...}
```

### 3. Voir la commande sur la carte
Vous devriez voir :
- 📍 **1 marker** pour la commande CMD-2025-000002
- 🔷 **Polygone bleu** = Zone Owendo
- 🟢 **Polygone vert** = Zone Akanda
- 🚚 **Marker camion** = Livreur Jean Dupoont

### 4. Cliquer sur le marker de la commande
Une modal s'ouvre avec :
- **Nom du client** : Michel Norbert
- **Adresse** : Lenakiri, owendo
- **Téléphone** : +24177808864
- **Montant** : 12000 FCFA
- **Statut** : EN ATTENTE

### 5. Vérifier la vérification de zone
Logs console attendus :
```
🔍 Vérification commande CMD-2025-000002: {
  driverZone: "Owendo",
  orderCoords: { lat: 0.3208235, lng: 9.4952738 },
  isInZone: true,
  orderAssignedZone: "Non assignée"
}
```

### 6. Cliquer sur "Accepter la commande"
Le bouton vert "Accepter la commande" devrait être visible.

**Logs attendus :**
```
📦 Acceptation commande: {
  orderId: "cmguc6iy60001sbquvkcbf6cq",
  driverId: null,
  zoneId: "cmgtq6e3r0001qk0k6gzuq2ay"
}
✅ Commande acceptée: {
  id: "cmguc6iy60001sbquvkcbf6cq",
  number: "CMD-2025-000002",
  status: "CONFIRMED",
  ...
}
```

**Alert attendu :**
```
✅ Commande acceptée
La commande CMD-2025-000002 a été ajoutée à votre liste de livraisons
```

### 7. Vérifier le changement de statut
Après avoir cliqué "OK" dans l'alert :
- La modal se ferme
- Les données se rechargent
- La commande n'apparaît plus dans les commandes PENDING
- Elle apparaît maintenant dans les commandes CONFIRMED

---

## ✅ Critères de succès

- [ ] La commande s'affiche sur la carte
- [ ] Le bouton "Accepter" est visible (car dans la zone)
- [ ] Le clic sur "Accepter" lance l'API
- [ ] L'API retourne `success: true`
- [ ] Le statut passe de `PENDING` à `CONFIRMED`
- [ ] Le livreur et la zone sont assignés
- [ ] L'alert de succès s'affiche
- [ ] Les données se rechargent

---

## 🐛 Problèmes courants

### Problème : "Network request failed"
**Cause** : Backend pas accessible depuis le mobile
**Solution** : Vérifier l'IP dans `/config/api.ts`

### Problème : Le bouton "Accepter" n'apparaît pas
**Cause** : La commande n'est pas dans la zone du livreur
**Solution** : Vérifier les logs de `isPointInPolygon`

### Problème : "Cette commande est déjà CONFIRMED"
**Cause** : La commande a déjà été acceptée
**Solution** : Exécuter `npx tsx scripts/reset-order-status.ts`

### Problème : "Livreur introuvable"
**Cause** : Le `driverId` est invalide
**Solution** : Pour l'instant, `driverId` est `null`, donc l'API n'assigne pas de livreur

---

## 📊 Vérification en base de données

Après l'acceptation, vérifier dans la DB :

```bash
npx tsx scripts/check-orders.ts
```

**Résultat attendu :**
```
1. Commande CMD-2025-000002
   Statut: CONFIRMED  ✅
   Client: Michel Norbert
   Livreur: Non assigné (car driverId = null en dev)
   Zone: Owendo ✅
```

---

## 🔄 Pour recommencer un test

1. Remettre la commande en PENDING :
   ```bash
   npx tsx scripts/reset-order-status.ts
   ```

2. Recharger l'app mobile (appuyer sur R)

3. Recommencer depuis l'étape 3

---

## 🚀 Prochaines étapes

1. **Authentification du livreur** : Récupérer le vrai `driverId` du livreur connecté
2. **Notifications** : Prévenir le magasin qu'un livreur a accepté
3. **Stock du livreur** : Assigner automatiquement le stock au livreur
4. **Historique** : Enregistrer l'heure d'acceptation
5. **Optimisation** : Calculer le temps de livraison estimé
