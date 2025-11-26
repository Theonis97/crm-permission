# Fix Erreur VAPID 403 - Synchronisation des clés

## 🎯 Problème identifié
```
❌ Erreur envoi notification PWA: [Error [WebPushError]: Received unexpected response code] {
  statusCode: 403,
  body: 'the VAPID credentials in the authorization header do not correspond to the credentials used to create the subscriptions.\n'
}
```

## 🔍 Cause du problème
Les clés VAPID utilisées pour **créer** les subscriptions (frontend PWA) sont différentes de celles utilisées pour **envoyer** les notifications (backend CRM).

### Workflow problématique :
1. **PWA** : Utilise clé VAPID A pour créer subscription
2. **Backend CRM** : Utilise clé VAPID B pour envoyer notification
3. **FCM** : Rejette car A ≠ B

## ✅ Solution appliquée

### 1. Synchronisation des clés VAPID

**Backend CRM** (`env.example`) :
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAbLN5kqGt8rXv8NzKzDwDg_pAy8cLxSTTdjNbiCVQH0HacDkQZp7DCqTJu4XvBWDFPuwhbR8_g41S_nlzQAbFc
VAPID_PRIVATE_KEY=y-6GrSppWokho3DqokirPby7FfmxvjsuMaWWzYn1VBg
VAPID_EMAIL=admin@inotech-gabon.com
```

**PWA Delivery** (`env.example`) :
```bash
# ⚠️ IMPORTANT: Clés VAPID - DOIVENT être identiques au backend CRM
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAbLN5kqGt8rXv8NzKzDwDg_pAy8cLxSTTdjNbiCVQH0HacDkQZp7DCqTJu4XvBWDFPuwhbR8_g41S_nlzQAbFc
```

### 2. Modification du service de notifications PWA

**Priorisation de la clé locale** :
```javascript
// 1. Essayer d'utiliser la clé VAPID locale (recommandé)
const localVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
if (localVapidKey) {
  console.log('🔑 Utilisation de la clé VAPID locale');
  this.vapidPublicKey = localVapidKey;
  return this.vapidPublicKey;
}

// 2. Fallback : récupérer depuis le serveur
```

## 🔧 Étapes de résolution

### 1. Synchroniser les variables d'environnement

**Backend CRM** (`.env`) :
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAbLN5kqGt8rXv8NzKzDwDg_pAy8cLxSTTdjNbiCVQH0HacDkQZp7DCqTJu4XvBWDFPuwhbR8_g41S_nlzQAbFc
VAPID_PRIVATE_KEY=y-6GrSppWokho3DqokirPby7FfmxvjsuMaWWzYn1VBg
VAPID_EMAIL=admin@inotech-gabon.com
```

**PWA Delivery** (`.env`) :
```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BAbLN5kqGt8rXv8NzKzDwDg_pAy8cLxSTTdjNbiCVQH0HacDkQZp7DCqTJu4XvBWDFPuwhbR8_g41S_nlzQAbFc
```

### 2. Nettoyer les anciennes subscriptions

```bash
# Exécuter le script de nettoyage
node scripts/fix-vapid-subscriptions.js
```

### 3. Redéployer les applications

**Backend CRM :**
```bash
npm run build
# Redémarrer le serveur
```

**PWA Delivery :**
```bash
npm run build
# Redéployer la PWA
```

### 4. Re-créer les subscriptions

**Pour chaque livreur :**
1. Ouvrir `https://dev-crm.inotech-gabon.com`
2. Se déconnecter puis se reconnecter
3. Cliquer sur l'icône de notification dans le header
4. Autoriser les notifications (nouvelles clés VAPID)

## 🧪 Validation

### 1. Vérifier les clés VAPID

```bash
# Backend
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY

# PWA (dans la console navigateur)
console.log(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
```

### 2. Tester les subscriptions

```bash
# Vérifier les subscriptions actives
curl https://dev-crm.inotech-gabon.com/api/pwa/debug

# Test d'envoi
curl https://dev-crm.inotech-gabon.com/api/pwa/test
```

### 3. Créer une commande POS

1. Aller sur le POS : `https://dev-crm.inotech-gabon.com/dashboard/stores/[id]/pos`
2. Créer une commande
3. Vérifier que la notification est reçue sans erreur 403

## 📊 Logs de validation

### Logs attendus (PWA) :
```
🔑 Utilisation de la clé VAPID locale
✅ Service Worker enregistré
📱 Subscription créée avec succès
```

### Logs attendus (Backend) :
```
📱 Envoi notification PWA à tous les abonnés...
✅ Notification PWA envoyée à 1 abonné(s)
```

### Logs d'erreur résolus :
```
❌ AVANT: statusCode: 403, body: 'VAPID credentials do not correspond'
✅ APRÈS: Notification PWA envoyée à 1 abonné(s)
```

## 🔒 Sécurité des clés VAPID

### Bonnes pratiques :
1. **Clé publique** : Peut être exposée (NEXT_PUBLIC_)
2. **Clé privée** : JAMAIS exposée côté client
3. **Email VAPID** : Contact administrateur
4. **Rotation** : Changer les clés périodiquement

### Génération de nouvelles clés :
```bash
# Si besoin de nouvelles clés
node scripts/generate-vapid-keys.js
node scripts/update-vapid-env.js
```

## 🚨 Points d'attention

### Variables d'environnement
- ✅ **Backend** : `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- ✅ **PWA** : `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (identique au backend)
- ❌ **Jamais** : Clé privée côté client

### Cache navigateur
- Vider le cache après changement de clés
- Forcer refresh du Service Worker
- Tester en navigation privée

### Monitoring
- Surveiller les erreurs 403 dans les logs
- Vérifier le taux de livraison des notifications
- Alerter si baisse soudaine des subscriptions

## 📞 Troubleshooting

### Erreur persiste après sync
1. Vérifier que les `.env` sont bien chargés
2. Redémarrer complètement les serveurs
3. Vider tous les caches navigateur
4. Supprimer manuellement les subscriptions en DB

### Nouvelles subscriptions échouent
1. Vérifier la clé publique VAPID côté PWA
2. Tester avec `console.log(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)`
3. Vérifier que le Service Worker est à jour

### Notifications partiellement livrées
1. Certaines subscriptions peuvent être avec anciennes clés
2. Exécuter le script de nettoyage complet
3. Forcer tous les utilisateurs à se réabonner

## ✅ Checklist de résolution

- [ ] Clés VAPID synchronisées entre backend et PWA
- [ ] Variables d'environnement mises à jour
- [ ] Anciennes subscriptions supprimées
- [ ] Applications redéployées
- [ ] Service Worker mis à jour
- [ ] Nouvelles subscriptions créées
- [ ] Test de notification réussi
- [ ] Logs sans erreur 403
- [ ] Monitoring activé
