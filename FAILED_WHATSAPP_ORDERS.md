# 🚨 Système de Gestion des Commandes WhatsApp avec Erreurs

## 📋 Vue d'ensemble

Ce système enregistre automatiquement les commandes WhatsApp qui contiennent des **produits non trouvés** dans la base de données, au lieu de les rejeter complètement. Cela permet à l'admin de les traiter manuellement plus tard.

## 🗄️ Table `failed_whatsapp_orders`

### Champs principaux

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | ID unique (cuid) |
| `rawMessage` | Text | Message WhatsApp original complet |
| `senderId` | String? | ID WhatsApp du vendeur |
| `senderPhone` | String? | Téléphone du vendeur |
| `timestamp` | DateTime? | Date/heure du message original |

### Données client extraites

| Champ | Type | Description |
|-------|------|-------------|
| `customerName` | String? | Nom du client |
| `customerPhone` | String? | Téléphone du client |
| `deliveryAddress` | String? | Adresse de livraison |
| `totalAmount` | Float? | Montant total de la commande |

### Détails de l'erreur

| Champ | Type | Description |
|-------|------|-------------|
| `requestedProducts` | JSON | Liste complète des produits demandés |
| `errorType` | String | Type d'erreur (PRODUCT_NOT_FOUND, etc.) |
| `errorDetails` | Text | Description détaillée de l'erreur |
| `missingProducts` | JSON | Tableau des codes produits non trouvés |

### Gestion et résolution

| Champ | Type | Description |
|-------|------|-------------|
| `status` | String | PENDING / RESOLVED / REJECTED |
| `resolvedAt` | DateTime? | Date de résolution |
| `resolvedBy` | String? | User ID qui a résolu |
| `resolvedOrderId` | String? | ID de la commande créée si résolu |
| `resolutionNotes` | Text? | Notes de résolution |

## 🔄 Workflow

### 1. Réception de commande WhatsApp

```
Bot WhatsApp → API /orders/from-whatsapp
              ↓
      Recherche produits
              ↓
   ❌ Produits manquants ?
              ↓
   Enregistrer dans failed_whatsapp_orders
```

### 2. Exemple de commande échouée

**Message WhatsApp reçu :**
```
Amissa
2 Parfum Yara
1 Crème D200
9000
066975825
Owendo
```

**Si "Parfum Yara" n'existe pas :**

```javascript
{
  rawMessage: "Amissa\n2 Parfum Yara\n1 Crème D200\n9000\n066975825\nOwendo",
  customerName: "Amissa",
  customerPhone: "066975825",
  deliveryAddress: "Owendo",
  totalAmount: 9000,
  requestedProducts: [
    { productCode: "Parfum Yara", quantity: 2, unitPrice: 4000 },
    { productCode: "Crème D200", quantity: 1, unitPrice: 1000 }
  ],
  errorType: "PRODUCT_NOT_FOUND",
  errorDetails: "Les produits suivants n'ont pas été trouvés : Parfum Yara",
  missingProducts: ["Parfum Yara"],
  status: "PENDING"
}
```

### 3. Réponse au bot

```json
{
  "success": false,
  "error": "Produit(s) non trouvé(s): Parfum Yara",
  "failedOrderId": "clxxxxx",
  "details": {
    "missingProducts": ["Parfum Yara"],
    "totalProducts": 2,
    "message": "La commande a été enregistrée dans les commandes à traiter manuellement"
  }
}
```

## 📊 API Endpoints

### GET `/api/orders/failed-whatsapp`

Récupère les commandes échouées

**Query params :**
- `status` : PENDING | RESOLVED | REJECTED (défaut: PENDING)

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxxxx",
      "customerName": "Amissa",
      "customerPhone": "066975825",
      "deliveryAddress": "Owendo",
      "totalAmount": 9000,
      "missingProducts": ["Parfum Yara"],
      "errorDetails": "Les produits suivants...",
      "status": "PENDING",
      "createdAt": "2025-11-04T00:00:00.000Z",
      "resolvedByUser": null
    }
  ],
  "count": 1
}
```

### PATCH `/api/orders/failed-whatsapp?id=xxx`

Marquer une commande comme résolue/rejetée

**Body :**
```json
{
  "status": "RESOLVED",
  "resolvedBy": "user_id",
  "resolvedOrderId": "order_id_if_created",
  "resolutionNotes": "Produit ajouté au catalogue et commande créée"
}
```

## 💡 Cas d'usage

### Scenario 1 : Nouveau produit

1. Client commande "Parfum Yara" (pas dans le catalogue)
2. ✅ Commande enregistrée dans `failed_whatsapp_orders`
3. 🔔 Admin notifié (future feature)
4. 👤 Admin ajoute "Parfum Yara" au catalogue
5. 📝 Admin crée manuellement la commande
6. ✅ Marque la failed order comme RESOLVED

### Scenario 2 : Erreur de nom

1. Client écrit "Parfume Yara" au lieu de "Parfum Yara"
2. ✅ Commande enregistrée
3. 👤 Admin identifie l'erreur
4. 📝 Admin corrige et crée la commande avec le bon produit
5. ✅ Marque comme RESOLVED

### Scenario 3 : Produit discontinué

1. Client commande un produit discontinué
2. ✅ Commande enregistrée
3. 👤 Admin voit la demande
4. ❌ Admin marque comme REJECTED avec note explicative
5. 📞 Admin contacte le client pour proposer alternative

## 🔍 Logs détaillés

```
📱 Réception d'une commande WhatsApp...
🔍 Recherche de 2 produit(s)...
🔍 Recherche produit: "Parfum Yara"
🔍 SKU non trouvé, recherche par nom contenant "Parfum Yara"...
❌ Produit "Parfum Yara" introuvable dans la base de données
✅ Produit trouvé: Crème D200 (prod_123)
🚨 1 produit(s) non trouvé(s), enregistrement dans failed_whatsapp_orders...
💾 Commande avec erreurs enregistrée: clxxxxx
```

## 📈 Statistiques possibles

```sql
-- Produits les plus demandés mais non trouvés
SELECT 
  jsonb_array_elements_text(missing_products) as product_code,
  COUNT(*) as requests
FROM failed_whatsapp_orders
WHERE status = 'PENDING'
GROUP BY product_code
ORDER BY requests DESC;
```

## 🚀 Évolutions futures

### Interface Admin

- 📊 Dashboard des commandes échouées
- 🔔 Notifications temps réel
- ⚡ Action rapide : "Ajouter au catalogue"
- 📝 Création de commande en 1 clic
- 📧 Contact automatique du client

### Analytics

- 📈 Graphique des produits manquants les plus demandés
- 🎯 Priorisation des ajouts au catalogue
- 📊 Taux de résolution
- ⏱️ Temps moyen de traitement

### Automatisation

- 🤖 Détection automatique de produits similaires
- 💬 Suggestions de produits alternatifs
- 📱 Message WhatsApp automatique au client
- ✉️ Email au vendeur avec statut

## ✅ Avantages

1. **Aucune perte de données** : Toutes les commandes sont conservées
2. **Traçabilité complète** : Message original + métadonnées
3. **Insights produits** : Identification des besoins non couverts
4. **Amélioration continue** : Enrichissement du catalogue basé sur la demande
5. **Satisfaction client** : Traitement différé au lieu de rejet

## 🔒 Sécurité

- ✅ Données sensibles (téléphone, adresse) chiffrées en BDD (si activé)
- ✅ Accès limité aux admins authentifiés
- ✅ Logs de toutes les actions de résolution
- ✅ Historique complet préservé même après résolution
