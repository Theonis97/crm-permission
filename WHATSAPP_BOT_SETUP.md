# Configuration du Bot WhatsApp - Intégration CRM

## Vue d'ensemble

Le bot WhatsApp automatise la création de commandes depuis les messages WhatsApp. Il utilise Gemini AI pour extraire les données et les envoie à l'API `/api/orders/from-whatsapp` du CRM.

## Configuration requise

### 1. Variable d'environnement CRM

Ajoutez cette variable dans le fichier `.env` ou `.env.local` du CRM Sambatech :

```bash
# Clé API pour authentifier les requêtes du bot WhatsApp
BACKEND_API_KEY=votre_cle_api_secrete_super_longue_et_complexe
```

**Important :** 
- Générez une clé sécurisée (minimum 32 caractères)
- Utilisez des caractères aléatoires (lettres, chiffres, symboles)
- Ne partagez jamais cette clé publiquement
- Ne committez pas cette clé dans Git

**Exemple de génération de clé sécurisée (Node.js) :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configuration du Bot WhatsApp

Dans le fichier `.env` du bot WhatsApp (`/bot-whatsapp/.env`), configurez :

```bash
BACKEND_API_URL=http://localhost:3000
BACKEND_API_KEY=la_meme_cle_que_dans_le_crm
```

## Fonctionnement de l'API

### Endpoint
```
POST /api/orders/from-whatsapp
```

### Authentification
Header requis :
```
Authorization: Bearer <BACKEND_API_KEY>
```

### Format de requête

```json
{
  "deliveryAddress": "Adresse complète de livraison",
  "productCode": "D200",
  "quantity": 3,
  "price": 11000,
  "phone": "066975825"
}
```

### Algorithme de traitement

1. **Validation** : Authentification par API Key
2. **Magasin** : Récupération du premier magasin actif du système
3. **Géocodage** : Conversion de l'adresse en coordonnées GPS (via Nominatim)
4. **Zone de livraison** : Identification de la zone par coordonnées GPS
5. **Produit** : Recherche par SKU puis par nom partiel
6. **Client** : Recherche par téléphone ou création nouveau contact
7. **Commande** : Création avec statut PENDING
8. **Notification** : Envoi push au livreur de la zone (si assigné)

### Réponse en cas de succès

```json
{
  "success": true,
  "orderId": "clxy123abc...",
  "orderNumber": "WA-2025-000001",
  "message": "Commande WA-2025-000001 créée avec succès",
  "details": {
    "store": "Nom du magasin",
    "product": "Nom du produit",
    "quantity": 3,
    "total": 12500,
    "deliveryZone": "Zone Nord",
    "coordinates": "0.4162, 9.4673"
  }
}
```

### Réponse en cas d'erreur

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "details": "Détails techniques (optionnel)"
}
```

## Cas d'erreur gérés

| Erreur | Code | Description |
|--------|------|-------------|
| Clé API invalide | 401 | L'en-tête Authorization est manquant ou incorrect |
| Champs manquants | 400 | Un ou plusieurs champs requis sont absents |
| Aucun magasin | 404 | Aucun magasin actif dans le système |
| Produit introuvable | 404 | Le code produit ne correspond à aucun produit |
| Erreur serveur | 500 | Erreur inattendue (vérifier les logs) |

## Fonctionnalités

### ✅ Géocodage automatique
- Utilise OpenStreetMap/Nominatim
- Multiples tentatives avec variantes d'adresse
- Détection automatique des villes gabonaises
- Fallback gracieux si échec

### ✅ Attribution de zone intelligente
- Calcul point-in-polygon
- Attribution automatique au livreur de la zone
- Calcul des frais de livraison

### ✅ Recherche de produit flexible
- Recherche par SKU exact prioritaire
- Recherche par nom partiel (insensible à la casse)
- Matching intelligent

### ✅ Gestion des clients
- Recherche par numéro de téléphone
- Création automatique si nouveau client
- Mise à jour des statistiques (totalOrders, totalSpent)

### ✅ Notifications push
- Notification automatique au livreur de la zone
- Données riches (numéro commande, client, montant, adresse)
- Gestion des erreurs sans bloquer la création

## Logs détaillés

Chaque étape du traitement génère des logs pour faciliter le debugging :

```
📱 Réception d'une commande WhatsApp...
📦 Données reçues: {...}
🏪 Récupération du premier magasin...
✅ Magasin trouvé: Boutique Principale (clxy...)
📍 Géocodage de l'adresse: "Akanda, Libreville"...
✅ Coordonnées trouvées: 0.6892, 9.3158
🗺️ Recherche de la zone de livraison...
✅ Zone de livraison trouvée: Zone Nord (clxy...)
🔍 Recherche du produit avec code: "D200"...
✅ Produit trouvé: Bouteille D'eau 200ml (clxy...)
👤 Recherche du client avec téléphone: 066975825...
✅ Contact existant trouvé: Client 5825 (clxy...)
📝 Création de la commande...
✅ Commande créée: WA-2025-000001 (clxy...)
📲 Envoi de notification push au livreur...
✅ Notification push envoyée
🎉 Commande WhatsApp créée avec succès!
```

## Sécurité

- ✅ Authentification par API Key
- ✅ Validation des données d'entrée
- ✅ Transactions atomiques (si implémenté)
- ✅ Logs détaillés pour audit
- ✅ Pas d'exposition de données sensibles dans les réponses

## Tests

### Test manuel avec cURL

```bash
curl -X POST http://localhost:3000/api/orders/from-whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer votre_cle_api" \
  -d '{
    "deliveryAddress": "Akanda, Libreville",
    "productCode": "D200",
    "quantity": 3,
    "price": 11000,
    "phone": "066975825"
  }'
```

### Test avec le bot WhatsApp

1. Lancer le bot : `cd bot-whatsapp && npm run dev`
2. Scanner le QR code WhatsApp
3. Envoyer un message au format :
   ```
   Akanda, Libreville
   3 D200
   11000
   066975825
   ```
4. Vérifier les logs du bot et du CRM
5. Vérifier la commande dans l'interface CRM

## Dépannage

### Erreur 401 - Unauthorized
- Vérifiez que `BACKEND_API_KEY` est identique dans les deux `.env`
- Vérifiez que le header `Authorization` est bien envoyé

### Produit introuvable
- Vérifiez que le SKU existe dans la base de données
- Essayez avec le nom complet du produit
- Vérifiez les logs pour voir la requête de recherche

### Géocodage échoue
- Normal pour certaines adresses
- La commande est créée quand même sans coordonnées
- Améliorer le format de l'adresse (ajouter ville, quartier)

### Pas de zone de livraison trouvée
- Les coordonnées ne correspondent à aucun polygone
- Vérifier les zones de livraison dans l'interface CRM
- La commande est créée mais sans livreur assigné

## Support

Pour toute question ou problème :
1. Vérifiez les logs serveur
2. Testez avec cURL pour isoler le problème
3. Vérifiez la configuration des variables d'environnement
