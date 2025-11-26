# Guide de Test - Notifications PWA pour Commandes POS

## 🎯 Objectif
Tester l'envoi automatique de notifications PWA à tous les livreurs lors de la création d'une commande depuis le POS.

## 📋 Prérequis

### 1. Backend CRM Sambatech
- ✅ Service PWA configuré avec VAPID keys
- ✅ Modifications appliquées dans `/api/store-orders/route.ts`
- ✅ Backend déployé et accessible

### 2. PWA Delivery
- ✅ Au moins un livreur connecté avec notifications activées
- ✅ Service Worker à jour
- ✅ PWA accessible sur `livreur.inotech-gabon.com`

## 🧪 Tests à effectuer

### Test 1: Vérification des abonnements PWA

```bash
# Vérifier les abonnements actifs
curl http://192.168.1.115:3001/api/pwa/debug

# Résultat attendu :
{
  "totalSubscriptions": 1,
  "drivers": ["driver-id-123"]
}
```

**Si aucun abonnement :**
1. Ouvrir `http://192.168.1.115:3001`
2. Se connecter comme livreur
3. Cliquer sur l'icône de notification dans le header
4. Autoriser les notifications
5. Revérifier les abonnements

### Test 2: Création de commande POS

**Étapes :**
1. Aller sur `http://192.168.1.115:3001/dashboard/stores/[store-id]/pos`
2. Créer une nouvelle commande avec :
   - Client : "Test PWA Client"
   - Téléphone : "+241 01 23 45 67"
   - Produits : Au moins 1 produit
   - Total : > 0 FCFA

**Logs backend attendus :**
```
📱 Envoi notification PWA à tous les abonnés...
✅ Notification PWA envoyée à 1 abonné(s)
```

### Test 3: Réception côté PWA

**PWA ouverte :**
- ✅ Toast notification apparaît
- ✅ Son de notification (si activé)
- ✅ Message : "🛒 Nouvelle commande ! CMD-XXX - Client - XXXX FCFA"

**PWA fermée :**
- ✅ Notification système native
- ✅ Titre : "🛒 Nouvelle commande POS !"
- ✅ Corps : "CMD-XXX - XXXX FCFA - Client"
- ✅ Actions : [Voir la commande] [Ignorer]

### Test 4: Actions sur notifications

**Action "Voir la commande" :**
- ✅ Ouvre la PWA sur `/dashboard`
- ✅ Log : "👀 Action: Voir la commande POS CMD-XXX"

**Action "Ignorer" :**
- ✅ Ferme la notification
- ✅ Log : "🚫 Action: Ignorer la commande POS CMD-XXX"

**Clic sur notification :**
- ✅ Ouvre la PWA sur `/dashboard`
- ✅ Log : "👆 Clic sur notification POS: CMD-XXX"

## 🔧 Scripts de test automatisés

### Test des abonnements
```bash
node scripts/test-pos-notifications.js
```

### Test manuel avec curl
```bash
# Créer une commande de test
curl -X POST http://192.168.1.115:3001/api/store-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "storeId": "store-id",
    "customerName": "Test PWA",
    "customerPhone": "+241123456789",
    "items": [{"productId": "product-id", "quantity": 1, "unitPrice": 5000}]
  }'
```

## 📊 Monitoring et Debug

### Logs à surveiller

**Backend CRM :**
```bash
# Rechercher dans les logs
grep "notification PWA" /var/log/backend.log
grep "📱 Envoi notification PWA" /var/log/backend.log
```

**PWA (Console navigateur) :**
```javascript
// Vérifier les notifications reçues
console.log(window.notificationService);

// Tester manuellement
window.notificationService.handleIncomingNotification({
  type: 'NEW_POS_ORDER',
  orderNumber: 'TEST-001',
  customerName: 'Test Client',
  total: '10000'
});
```

### Endpoints de debug

**Statistiques PWA :**
```
GET /api/pwa/debug
```

**Test notification directe :**
```
GET /api/pwa/test
```

## ❌ Problèmes courants

### Aucune notification reçue

**Causes possibles :**
1. **Aucun abonnement PWA** → Activer notifications dans PWA
2. **CORS bloqué** → Vérifier configuration CORS backend
3. **VAPID keys invalides** → Régénérer les clés
4. **Service Worker non à jour** → Forcer refresh PWA

**Debug :**
```bash
# Vérifier abonnements
curl http://192.168.1.115:3001/api/pwa/debug

# Tester notification directe
curl http://192.168.1.115:3001/api/pwa/test
```

### Notification reçue mais pas d'action

**Causes possibles :**
1. **Service Worker non mis à jour** → Vider cache navigateur
2. **Erreur JavaScript** → Vérifier console navigateur
3. **URL incorrecte** → Vérifier `data.url` dans notification

### Erreur 500 lors création commande

**Causes possibles :**
1. **Import manquant** → Vérifier `pwaPushNotificationService`
2. **VAPID non configuré** → Vérifier variables d'environnement
3. **Base de données** → Vérifier table `pwa_push_subscriptions`

## ✅ Checklist de validation

### Fonctionnalités de base
- [ ] Abonnement PWA fonctionne
- [ ] Création commande POS réussie
- [ ] Notification PWA envoyée
- [ ] Notification reçue côté livreur

### Interface utilisateur
- [ ] Toast notification (PWA ouverte)
- [ ] Notification native (PWA fermée)
- [ ] Actions "Voir" et "Ignorer"
- [ ] Navigation vers dashboard

### Monitoring
- [ ] Logs backend corrects
- [ ] Statistiques PWA à jour
- [ ] Pas d'erreurs JavaScript
- [ ] Performance acceptable

### Edge cases
- [ ] Plusieurs livreurs abonnés
- [ ] PWA fermée puis rouverte
- [ ] Notifications multiples
- [ ] Erreur réseau temporaire

## 📈 Métriques de succès

**Technique :**
- Taux de livraison notifications : > 95%
- Temps de réception : < 5 secondes
- Taux d'erreur : < 1%

**Business :**
- Taux de clic sur notifications : > 20%
- Temps de réaction livreurs : < 2 minutes
- Satisfaction utilisateur : > 4/5

## 🚀 Mise en production

### Avant déploiement
- [ ] Tous les tests passent
- [ ] Logs de debug supprimés/réduits
- [ ] Variables d'environnement configurées
- [ ] Documentation mise à jour

### Après déploiement
- [ ] Monitoring activé
- [ ] Tests de régression OK
- [ ] Formation équipe effectuée
- [ ] Feedback utilisateurs collecté
