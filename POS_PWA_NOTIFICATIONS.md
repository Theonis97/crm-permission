# Notifications PWA pour Commandes POS

## 🎯 Fonctionnalité
Envoi automatique de notifications push PWA à tous les livreurs abonnés lorsqu'une nouvelle commande est créée depuis le POS.

## 🔧 Implémentation

### API Modifiée
**Route :** `/api/store-orders` (POST)
**Fichier :** `app/api/store-orders/route.ts`

### Logique d'envoi
1. **Création de commande** : La commande est créée normalement
2. **Notifications FCM** : Envoyées aux livreurs de la zone (existant)
3. **🆕 Notifications PWA** : Envoyées à TOUS les abonnés PWA

### Contenu de la notification PWA
```javascript
{
  title: '🛒 Nouvelle commande POS !',
  body: 'CMD-2024-000123 - 15 000 FCFA - Jean Dupont',
  icon: '/icons/icon-192x192.png',
  badge: '/icons/badge-72x72.png',
  data: {
    type: 'NEW_POS_ORDER',
    orderId: 'order-id',
    orderNumber: 'CMD-2024-000123',
    customerName: 'Jean Dupont',
    total: '15000',
    storeId: 'store-id',
    storeName: 'Magasin Principal',
    url: '/dashboard',
    timestamp: '2024-11-11T01:30:00.000Z'
  },
  actions: [
    { action: 'view', title: 'Voir la commande' },
    { action: 'dismiss', title: 'Ignorer' }
  ]
}
```

## 🔄 Workflow

### 1. Création de commande POS
```
Dashboard → Stores → [Store] → POS → Créer commande
```

### 2. Traitement backend
1. ✅ Validation des données
2. ✅ Création de la commande en base
3. ✅ Mise à jour du stock
4. ✅ Envoi notifications FCM (zone/livreur)
5. 🆕 **Envoi notifications PWA (tous)**

### 3. Réception côté livreur
- **PWA ouverte** : Toast notification + son
- **PWA fermée** : Notification système native
- **Actions disponibles** : Voir / Ignorer

## 🎨 Interface utilisateur

### Notification native (PWA fermée)
```
🛒 Nouvelle commande POS !
CMD-2024-000123 - 15 000 FCFA - Jean Dupont

[Voir la commande] [Ignorer]
```

### Toast notification (PWA ouverte)
```
🛒 Nouvelle commande !
CMD-2024-000123 - Jean Dupont
15 000 FCFA
```

## 📊 Statistiques et monitoring

### Logs backend
```bash
📱 Envoi notification PWA à tous les abonnés...
✅ Notification PWA envoyée à 5 abonné(s)
```

### Debug endpoint
```
GET /api/pwa/debug
{
  "totalSubscriptions": 5,
  "drivers": ["driver1", "driver2", "driver3", "driver4", "driver5"]
}
```

## 🧪 Tests

### Script de test
```bash
node scripts/test-pos-notifications.js
```

### Test manuel
1. **Préparer** : S'assurer d'avoir des abonnements PWA actifs
2. **Créer** : Nouvelle commande depuis le POS
3. **Vérifier** : Notifications reçues sur toutes les PWA

### Vérification des abonnements
```bash
# Vérifier les abonnements actifs
curl http://localhost:3000/api/pwa/debug
```

## 🔒 Sécurité

### Permissions requises
- **Création commande** : `orders.create`
- **Notifications** : Aucune permission supplémentaire

### Gestion des erreurs
- **Échec notification** : N'empêche pas la création de commande
- **Logs détaillés** : Pour diagnostic
- **Fallback gracieux** : Commande créée même si notifications échouent

## 📈 Impact business

### Avantages
- ✅ **Réactivité** : Tous les livreurs informés instantanément
- ✅ **Couverture** : Pas de limitation par zone
- ✅ **Engagement** : Notifications riches avec actions
- ✅ **Traçabilité** : Logs détaillés pour monitoring

### Métriques
- **Taux de livraison** : Notifications envoyées vs abonnés
- **Temps de réaction** : Délai entre création et prise en charge
- **Engagement** : Clics sur notifications

## 🔧 Configuration

### Variables d'environnement
```bash
# VAPID keys pour PWA (déjà configurées)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
```

### Personnalisation
```javascript
// Modifier dans app/api/store-orders/route.ts
const notificationResult = await pwaPushNotificationService.sendNotificationToAllDrivers({
  title: '🛒 Nouvelle commande POS !', // Personnalisable
  body: `${orderNumber} - ${total} FCFA - ${customerName}`,
  // ... autres options
})
```

## 🚀 Déploiement

### Checklist
- [ ] Backend déployé avec modifications
- [ ] Service Worker PWA à jour
- [ ] VAPID keys configurées
- [ ] Tests de notifications réussis
- [ ] Monitoring activé

### Rollback
En cas de problème, commenter la section PWA dans `store-orders/route.ts` :
```javascript
// 🔔 NOUVEAU : Envoyer notification PWA à tous les abonnés
// try {
//   ... code notifications PWA
// } catch (pwaNotificationError) {
//   ...
// }
```

## 📞 Support

### Diagnostic
1. **Vérifier abonnements** : `/api/pwa/debug`
2. **Logs backend** : Rechercher "📱 Envoi notification PWA"
3. **Test manuel** : Script `test-pos-notifications.js`

### Problèmes courants
- **Aucune notification** : Vérifier abonnements PWA actifs
- **Erreur VAPID** : Vérifier clés d'environnement
- **Timeout** : Vérifier connectivité réseau
