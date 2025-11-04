# 📱 Notifications WhatsApp Admin - Commandes échouées

## 🎯 Vue d'ensemble

Lorsqu'une commande WhatsApp échoue à cause de produits non trouvés, une notification automatique est envoyée au numéro admin **+24174820189** via WhatsApp.

## 🏗️ Architecture

### 1. Service de notifications (CRM)
**Fichier** : `/lib/whatsapp-notifications.ts`

**Fonctions principales :**
- `notifyAdminFailedOrder()` : Envoie une notification formatée
- `sendWhatsAppMessage()` : Envoie un message générique
- `formatFailedOrderMessage()` : Formate le message d'alerte

### 2. API Bot WhatsApp
**Fichier** : `/bot-whatsapp/src/web-server.ts`

**Nouvelle route :**
```typescript
POST /api/send-message
Headers:
  - Authorization: Bearer <BACKEND_API_KEY>
Body:
  - phone: string (ex: "+24174820189")
  - message: string
```

**Sécurité :**
- Authentification par API Key (même clé que le backend CRM)
- Vérification de la connexion WhatsApp
- Logs détaillés des envois

### 3. Intégration dans l'API
**Fichier** : `/api/orders/from-whatsapp/route.ts`

**Déclenchement :**
Après l'enregistrement d'une commande échouée :
```typescript
await notifyAdminFailedOrder({
  customerName,
  customerPhone,
  deliveryAddress,
  totalAmount,
  missingProducts,
  failedOrderId
})
```

## 📨 Format du message

```
🚨 *COMMANDE WHATSAPP ÉCHOUÉE* 🚨

❌ *Produit(s) non trouvé(s)*

👤 *Client:* Amissa
📞 *Téléphone:* 066975825
📍 *Adresse:* Owendo Seeg
💰 *Montant:* 9,000 FCFA

🛒 *Produits manquants:*
1. Parfum Yara
2. Crème XYZ

🔗 *ID Commande échouée:* cm...

⚠️ *Action requise:*
Veuillez corriger cette commande dans le dashboard:
👉 Dashboard > Delivery Map > Erreurs WhatsApp

---
_Message automatique du système CRM_
```

## ⚙️ Configuration

### Variables d'environnement requises

#### CRM (`/crm-sambatech/.env`)
```bash
# API Key partagée avec le bot
BACKEND_API_KEY=your-secret-api-key

# URL du serveur bot WhatsApp
BOT_WHATSAPP_URL=http://localhost:3001
# En production:
# BOT_WHATSAPP_URL=https://bot.votre-domaine.com
```

#### Bot WhatsApp (`/bot-whatsapp/.env`)
```bash
# API Key (identique au CRM)
BACKEND_API_KEY=your-secret-api-key

# Port du serveur web
WEB_PORT=3001
```

## 🚀 Démarrage

### 1. Démarrer le bot WhatsApp avec serveur web
```bash
cd bot-whatsapp
npm run web
```

Le serveur démarre sur `http://localhost:3001`

### 2. Vérifier la connexion
```bash
curl http://localhost:3001/api/status
```

Réponse attendue :
```json
{
  "status": "connected",
  "qrCode": null,
  "hostNumber": "24177123456"
}
```

### 3. Tester l'envoi de message
```bash
curl -X POST http://localhost:3001/api/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-api-key" \
  -d '{
    "phone": "+24174820189",
    "message": "Test de notification admin"
  }'
```

## 🔄 Workflow complet

```
1. Commande WhatsApp reçue avec "Parfum Yara"
   ↓
2. API /from-whatsapp cherche le produit → ❌ Non trouvé
   ↓
3. Enregistrement dans failed_whatsapp_orders
   ↓
4. Appel notifyAdminFailedOrder()
   ↓
5. Formatage du message avec détails
   ↓
6. Appel POST http://localhost:3001/api/send-message
   ↓
7. Bot WhatsApp envoie le message au +24174820189
   ↓
8. ✅ Admin reçoit la notification sur WhatsApp
   ↓
9. Admin ouvre Dashboard > Delivery Map > Erreurs WhatsApp
   ↓
10. Admin corrige et soumet la commande
```

## 📊 Logs et monitoring

### Logs CRM
```
📱 Envoi notification WhatsApp admin pour commande échouée...
📱 Envoi message WhatsApp vers +24174820189...
✅ Message WhatsApp envoyé avec succès
✅ Notification admin envoyée avec succès au +24174820189
```

### Logs Bot WhatsApp
```
📨 ════════════════════════════════════════════════
📤 Envoi message notification admin
📞 Destinataire: +24174820189
⏰ Date: 04/11/2025, 15:30:00
💬 Message: [contenu du message]
════════════════════════════════════════════════

✅ Message envoyé avec succès
```

## 🛡️ Sécurité

### Authentification
- **API Key** : Partagée entre CRM et Bot
- **Validation** : Vérification systématique du Bearer token
- **Isolation** : Bot accessible uniquement en local (ou via VPN en prod)

### Gestion des erreurs
- **Non bloquante** : Si l'envoi échoue, la commande est quand même enregistrée
- **Logs détaillés** : Toutes les tentatives sont tracées
- **Retry** : Pas de retry automatique (notification optionnelle)

## 🐛 Troubleshooting

### Message non reçu ?

**1. Vérifier que le bot est connecté**
```bash
curl http://localhost:3001/api/status
```

Si `status: "disconnected"` :
```bash
curl -X POST http://localhost:3001/api/reconnect
```

**2. Vérifier les logs**
- Logs CRM : Chercher "📱 Envoi notification WhatsApp"
- Logs Bot : Chercher "📤 Envoi message notification admin"

**3. Vérifier l'API Key**
```bash
echo $BACKEND_API_KEY
```

**4. Tester manuellement**
```bash
curl -X POST http://localhost:3001/api/send-message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BACKEND_API_KEY" \
  -d '{"phone": "+24174820189", "message": "Test"}'
```

### Erreur 401 Unauthorized
- Vérifier que `BACKEND_API_KEY` est identique dans CRM et Bot
- Vérifier le header `Authorization: Bearer ...`

### Erreur 503 Service Unavailable
- Le bot n'est pas connecté à WhatsApp
- Scanner le QR code ou reconnecter le bot

### Erreur réseau
- Vérifier que `BOT_WHATSAPP_URL` pointe vers le bon serveur
- En local : `http://localhost:3001`
- En prod : URL du serveur bot

## 📈 Améliorations futures

### Court terme
- ✅ **Notification admin** (implémenté)
- 🔔 **Notifications multiples** (plusieurs admins)
- 📊 **Dashboard monitoring** (compteur notifications envoyées)

### Moyen terme
- 🔄 **Retry automatique** avec exponential backoff
- 📧 **Fallback email** si WhatsApp échoue
- 📱 **SMS** en secours

### Long terme
- 🤖 **Réponse automatique** aux notifications
- 📊 **Analytics** des notifications
- 🔔 **Système d'escalade** (si pas traité sous X minutes)

## ✅ Checklist déploiement

- [x] Service de notifications créé
- [x] API bot WhatsApp ajoutée
- [x] Intégration dans /from-whatsapp
- [x] Authentification par API Key
- [x] Formatage du message
- [x] Logs détaillés
- [x] Gestion d'erreur non bloquante
- [ ] Tests en production
- [ ] Monitoring actif
- [ ] Documentation admin

## 🎯 Configuration Admin

**Numéro admin actuel** : `+24174820189`

Pour changer le numéro :
1. Modifier `/lib/whatsapp-notifications.ts`
2. Ligne 6 : `const ADMIN_PHONE = '+24174820189'`
3. Redémarrer le serveur CRM

Pour ajouter plusieurs admins :
```typescript
const ADMIN_PHONES = [
  '+24174820189',
  '+24177123456',
  '+24166987654'
]

// Dans notifyAdminFailedOrder:
for (const phone of ADMIN_PHONES) {
  await sendWhatsAppMessage(phone, message)
}
```

## 📝 Notes importantes

1. **Le bot WhatsApp doit être démarré** avec `npm run web`
2. **L'API Key doit être identique** dans CRM et Bot
3. **Le numéro admin doit avoir WhatsApp** actif
4. **Les notifications sont non bloquantes** : l'échec n'empêche pas l'enregistrement de la commande
5. **Format du numéro** : `+241XXXXXXXX` (indicatif pays + numéro)
