# 📱 Notifications Push POS - Système complet

## ✅ Statut : Implémenté et corrigé

Les notifications push sont **automatiquement envoyées** à tous les livreurs d'une zone lorsqu'une commande est créée depuis le **Point de Vente (POS)**.

## 🏗️ Architecture

```
┌──────────────────┐
│   Page POS       │  1. Vendeur crée commande
│  stores/[id]/pos │     avec zone de livraison
└────────┬─────────┘
         │
         │ POST /api/store-orders
         ↓
┌──────────────────┐
│  API Route       │  2. Créer commande en BDD
│ /api/store-      │  3. Envoyer notification push
│  orders          │     via ExpoPushService
└────────┬─────────┘
         │
         │ ExpoPushService.notifyDriversInZone()
         ↓
┌──────────────────┐
│ Expo Push API    │  4. Distribution via FCM/APNS
│ exp.host/push    │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  📱 Livreurs     │  5. Notification reçue sur mobile
│  (Inotech Driver)│     - Tous les livreurs de la zone
└──────────────────┘
```

## 🔧 Bug corrigé

### Avant (❌)
```typescript
// Récupérait UN SEUL livreur par zone
const zone = await prisma.deliveryZone.findUnique({
  include: {
    deliveryPerson: { ... } // Relation 1-1
  }
})
```

### Après (✅)
```typescript
// Récupère TOUS les livreurs de la zone
const deliveryPersons = await prisma.deliveryPerson.findMany({
  where: {
    isActive: true,
    deliveryZones: {
      some: { id: zoneId } // Many-to-many
    }
  }
})
```

## 📋 Fonctionnement détaillé

### 1. Création de commande dans le POS

```typescript
// /app/dashboard/stores/[id]/pos/page.tsx (ligne 509)
const response = await fetch("/api/store-orders", {
  method: "POST",
  body: JSON.stringify({
    storeId,
    customerName,
    customerPhone,
    deliveryZoneId, // ⭐ Zone de livraison
    items,
    // ... autres données
  })
})
```

### 2. Traitement backend

```typescript
// /app/api/store-orders/route.ts (lignes 303-354)

// Si la commande a une zone de livraison
if (storeOrder.deliveryZoneId && storeOrder.deliveryZone) {
  await ExpoPushService.notifyDriversInZone(
    storeOrder.deliveryZoneId,
    '🚚 Nouvelle commande !',
    `Commande ${storeOrder.number} - ${storeOrder.total.toLocaleString()} FCFA - ${storeOrder.customerName}`,
    {
      type: 'NEW_ORDER',
      orderId: storeOrder.id,
      orderNumber: storeOrder.number,
      amount: storeOrder.total.toString(),
      zone: storeOrder.deliveryZone.name,
      customerName: storeOrder.customerName,
      action: 'VIEW_ORDER',
    }
  )
}

// Si pas de zone mais un livreur assigné directement
else if (storeOrder.deliveryPersonId) {
  await ExpoPushService.notifyDriver(
    storeOrder.deliveryPersonId,
    '📦 Nouvelle commande assignée',
    `Commande ${storeOrder.number} - ${storeOrder.total.toLocaleString()} FCFA`,
    { ... }
  )
}
```

### 3. Service de notifications

```typescript
// /lib/notifications/expo-push-service.ts (lignes 180-243)

static async notifyDriversInZone(zoneId, title, body, data) {
  // 1. Récupérer TOUS les livreurs actifs de la zone
  const deliveryPersons = await prisma.deliveryPerson.findMany({
    where: {
      isActive: true,
      deliveryZones: {
        some: { id: zoneId, isActive: true }
      }
    },
    include: {
      pushTokens: { where: { isActive: true } }
    }
  })
  
  // 2. Collecter tous les tokens
  const tokens = []
  deliveryPersons.forEach(person => {
    person.pushTokens.forEach(t => tokens.push(t.token))
  })
  
  // 3. Envoyer via Expo Push API
  const result = await this.sendPushNotifications(tokens, title, body, data)
  
  return result.success
}
```

### 4. Réception sur mobile

```typescript
// /inotech-driver/services/firebaseService.ts

// Écouter les notifications
firebaseService.onNotificationReceived((notification) => {
  const data = notification.request.content.data
  
  if (data.type === 'NEW_ORDER') {
    // Afficher toast
    // Rafraîchir la carte
    // Incrémenter badge
  }
})
```

## 📊 Conditions d'envoi

| Condition | Notification envoyée à |
|-----------|------------------------|
| ✅ Zone de livraison définie | Tous les livreurs de la zone |
| ✅ Pas de zone, mais livreur assigné | Le livreur assigné uniquement |
| ❌ Ni zone ni livreur | Aucune notification |

## 🎯 Données transmises dans la notification

```typescript
{
  // Métadonnées système
  type: 'NEW_ORDER',          // Type de notification
  action: 'VIEW_ORDER',        // Action à effectuer
  
  // Données de la commande
  orderId: 'cm3k...',         // ID unique
  orderNumber: 'CMD-2025-000123',
  amount: '15000',            // Montant en FCFA
  
  // Données client
  customerName: 'Amissa',
  
  // Localisation
  zone: 'Th',                 // Nom de la zone
}
```

## 🔍 Logs de débogage

Le système génère des logs détaillés :

```bash
# Création de commande
🔍 Debug commande créée: { id, number, deliveryZoneId, ... }

# Envoi de notification
📱 Envoi notification FCM pour zone Th
📱 [PUSH] Envoi notifications pour zone cm3k...
📱 [PUSH] 3 livreur(s) trouvé(s) pour la zone
   - Jean Livreur: 1 token(s)
   - Marie Driver: 2 token(s)
   - Paul Transport: 1 token(s)
📤 Envoi de 4 notification(s) push...
✅ 4/4 notifications envoyées avec succès
✅ Notification FCM envoyée pour commande CMD-2025-000123

# Ou si erreur
⚠️ Aucun livreur actif trouvé pour la zone cm3k...
❌ Erreur envoi notification FCM: [détails]
```

## 🧪 Test de la fonctionnalité

### 1. Préparer l'environnement

```bash
# Sur mobile (Inotech Driver)
1. Se connecter avec un compte livreur
2. Vérifier que le token push est enregistré
3. Vérifier que le livreur a des zones assignées
```

### 2. Créer une commande POS

```bash
# Dans le CRM
1. Aller sur /dashboard/stores/[id]/pos
2. Ajouter des produits
3. Renseigner les infos client
4. ⭐ IMPORTANT: Sélectionner une zone de livraison
5. Valider la commande
```

### 3. Vérifier la réception

```bash
# Sur mobile
✅ Notification doit apparaître instantanément
✅ Badge de notifications doit augmenter
✅ Toast "Nouvelle commande" affiché
✅ Données de commande accessibles
```

### 4. Vérifier les logs backend

```bash
# Logs serveur CRM
📱 [PUSH] Envoi notifications pour zone...
📱 [PUSH] X livreur(s) trouvé(s)
✅ Notifications envoyées avec succès
```

## ⚠️ Points d'attention

### Conditions obligatoires

- ✅ Le livreur doit avoir un **token push enregistré**
- ✅ Le livreur doit être **actif** (`isActive: true`)
- ✅ La zone doit être **active** (`isActive: true`)
- ✅ Le livreur doit être **assigné à la zone** (table `deliveryZones`)

### Erreurs communes

**"Aucun livreur trouvé pour la zone"**
- Vérifier que des livreurs sont assignés à cette zone
- Vérifier que les livreurs sont actifs

**"Aucun token actif"**
- Le livreur n'a pas ouvert l'app mobile
- Le token n'a pas été enregistré
- Le token a expiré

**"Notifications non reçues"**
- Vérifier les permissions sur mobile
- Vérifier que l'app est autorisée à recevoir des notifications
- Tester avec une notification locale d'abord

## 📈 Statistiques et monitoring

Les envois de notifications sont loggés pour analytics :

```sql
-- Nombre de notifications envoyées aujourd'hui
SELECT COUNT(*) FROM logs 
WHERE type = 'PUSH_NOTIFICATION' 
AND DATE(created_at) = CURRENT_DATE;

-- Tokens actifs par zone
SELECT dz.name, COUNT(DISTINCT dpt.id) as tokens
FROM delivery_zones dz
JOIN delivery_persons dp ON dp.id = ANY(dz.delivery_person_ids)
JOIN delivery_person_push_tokens dpt ON dpt.delivery_person_id = dp.id
WHERE dpt.is_active = true
GROUP BY dz.id;
```

## 🔗 Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `/app/dashboard/stores/[id]/pos/page.tsx` | Interface POS |
| `/app/api/store-orders/route.ts` | Création commande + envoi notification |
| `/lib/notifications/expo-push-service.ts` | Service d'envoi (corrigé) |
| `/prisma/schema.prisma` | Modèles BDD |
| `/inotech-driver/services/firebaseService.ts` | Réception mobile |

## ✨ Améliorations futures

- [ ] Retry automatique en cas d'échec
- [ ] Notifications avec sons personnalisés
- [ ] Analytics détaillées des notifications
- [ ] A/B testing des messages
- [ ] Notifications silencieuses pour sync données
- [ ] Templates de messages configurables
- [ ] Délai configurable avant envoi
- [ ] Notification admin si aucun livreur disponible

## 📚 Documentation liée

- [PUSH-NOTIFICATIONS-GUIDE.md](./PUSH-NOTIFICATIONS-GUIDE.md) - Guide général
- [FCM_NOTIFICATIONS_GUIDE.md](./FCM_NOTIFICATIONS_GUIDE.md) - Configuration FCM
- [/inotech-driver/NOTIFICATIONS_GUIDE.md](../inotech-driver/NOTIFICATIONS_GUIDE.md) - Côté mobile

---

**✅ Résumé** : Les notifications push du POS sont **100% fonctionnelles** après correction du bug de récupération des livreurs par zone. Tous les livreurs actifs d'une zone reçoivent désormais la notification instantanément lors de la création d'une commande.
