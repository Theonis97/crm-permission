# 📚 Documentation API Externe - CRM Sambatech

> **Version** : 1.0  
> **Date** : 12 Décembre 2025  
> **Base URL** : `https://votre-domaine.com`

---

## 🔐 Authentification

Toutes les routes `/api/ext/*` nécessitent une authentification via **API Key**.

### Header requis

```
x-api-key: <votre-clé-api>
```

### Codes d'erreur d'authentification

| Code HTTP | Code | Message | Description |
|-----------|------|---------|-------------|
| `401` | `MISSING_API_KEY` | API key is required | Header `x-api-key` absent |
| `401` | `INVALID_API_KEY` | Invalid API key | Clé API incorrecte |
| `500` | `SERVER_ERROR` | Server configuration error | Variable `BACKEND_API_KEY` non configurée côté serveur |

### Exemple d'erreur

```json
{
  "error": "API key is required",
  "code": "MISSING_API_KEY"
}
```

---

## 📦 Routes API

### Sommaire

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/ext/categories` | `GET` | Lister toutes les catégories |
| `/api/ext/categories` | `POST` | Créer une catégorie |
| `/api/ext/products` | `POST` | Créer un produit |
| `/api/delivery/orders/{orderId}/ext-deliver` | `POST` | Marquer une commande comme livrée |

---

## 1️⃣ Lister les catégories

### `GET /api/ext/categories`

Récupère la liste de toutes les catégories de produits avec leurs sous-catégories et le nombre de produits associés.

### Headers

| Header | Valeur | Requis |
|--------|--------|--------|
| `x-api-key` | Votre clé API | ✅ Oui |

### Paramètres

Aucun paramètre requis.

### Exemple de requête

```bash
curl -X GET "https://votre-domaine.com/api/ext/categories" \
  -H "x-api-key: votre-cle-api"
```

### Réponse succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "clxyz123abc",
      "name": "Électronique",
      "description": "Produits électroniques",
      "parentId": null,
      "createdAt": "2025-12-12T10:00:00.000Z",
      "updatedAt": "2025-12-12T10:00:00.000Z",
      "parent": null,
      "subcategories": [
        {
          "id": "clxyz456def",
          "name": "Smartphones",
          "description": null,
          "parentId": "clxyz123abc"
        }
      ],
      "_count": {
        "products": 15
      }
    }
  ],
  "count": 1
}
```

### Réponses d'erreur

| Code | Description |
|------|-------------|
| `401` | Authentification échouée |
| `500` | Erreur serveur interne |

---

## 2️⃣ Créer une catégorie

### `POST /api/ext/categories`

Crée une nouvelle catégorie de produit.

### Headers

| Header | Valeur | Requis |
|--------|--------|--------|
| `x-api-key` | Votre clé API | ✅ Oui |
| `Content-Type` | `application/json` | ✅ Oui |

### Body (JSON)

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `name` | `string` | ✅ Oui | Nom de la catégorie |
| `description` | `string` | ❌ Non | Description de la catégorie |
| `parentId` | `string` | ❌ Non | ID de la catégorie parente (pour sous-catégorie) |

### Exemple de requête

```bash
curl -X POST "https://votre-domaine.com/api/ext/categories" \
  -H "x-api-key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cosmétiques",
    "description": "Produits de beauté et soins",
    "parentId": null
  }'
```

### Réponse succès (201)

```json
{
  "success": true,
  "data": {
    "id": "clxyz789ghi",
    "name": "Cosmétiques",
    "description": "Produits de beauté et soins",
    "parentId": null,
    "createdAt": "2025-12-12T11:00:00.000Z",
    "updatedAt": "2025-12-12T11:00:00.000Z",
    "parent": null,
    "subcategories": [],
    "_count": {
      "products": 0
    }
  }
}
```

### Réponses d'erreur

| Code | Message | Description |
|------|---------|-------------|
| `400` | `Name is required` | Le champ `name` est vide ou absent |
| `400` | `Parent category not found` | Le `parentId` fourni n'existe pas |
| `401` | Authentification échouée | Clé API invalide |
| `500` | `Internal server error` | Erreur serveur |

---

## 3️⃣ Créer un produit

### `POST /api/ext/products`

Crée un nouveau produit dans le catalogue.

### Headers

| Header | Valeur | Requis |
|--------|--------|--------|
| `x-api-key` | Votre clé API | ✅ Oui |
| `Content-Type` | `application/json` | ✅ Oui |

### Body (JSON)

| Champ | Type | Requis | Description | Valeur par défaut |
|-------|------|--------|-------------|-------------------|
| `name` | `string` | ✅ Oui | Nom du produit | - |
| `prixVente` | `number` | ✅ Oui | Prix de vente (FCFA) | - |
| `prixAchat` | `number` | ✅ Oui | Prix d'achat (FCFA) | - |
| `categoryId` | `string` | ✅ Oui | ID de la catégorie | - |
| `sku` | `string` | ❌ Non | Code produit unique | `null` |
| `description` | `string` | ❌ Non | Description du produit | `null` |
| `photos` | `string[]` | ❌ Non | URLs des images | `[]` |
| `tva` | `number` | ❌ Non | Taux de TVA (%) | `20` |
| `stock` | `number` | ❌ Non | Quantité en stock | `0` |
| `minStock` | `number` | ❌ Non | Seuil d'alerte stock | `0` |
| `maxStock` | `number` | ❌ Non | Stock maximum | `null` |
| `brandId` | `string` | ❌ Non | ID de la marque | `null` |

### Exemple de requête

```bash
curl -X POST "https://votre-domaine.com/api/ext/products" \
  -H "x-api-key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Parfum Yara",
    "sku": "PARF-YARA-001",
    "description": "Parfum oriental pour femme",
    "photos": ["https://example.com/image1.jpg"],
    "prixVente": 25000,
    "prixAchat": 18000,
    "tva": 18,
    "stock": 50,
    "minStock": 5,
    "maxStock": 100,
    "categoryId": "clxyz789ghi",
    "brandId": null
  }'
```

### Réponse succès (201)

```json
{
  "success": true,
  "data": {
    "id": "clprod123xyz",
    "name": "Parfum Yara",
    "sku": "PARF-YARA-001",
    "description": "Parfum oriental pour femme",
    "photos": ["https://example.com/image1.jpg"],
    "prixVente": 25000,
    "prixAchat": 18000,
    "tva": 18,
    "stock": 50,
    "minStock": 5,
    "maxStock": 100,
    "categoryId": "clxyz789ghi",
    "brandId": null,
    "createdAt": "2025-12-12T12:00:00.000Z",
    "updatedAt": "2025-12-12T12:00:00.000Z",
    "category": {
      "id": "clxyz789ghi",
      "name": "Cosmétiques",
      "description": "Produits de beauté et soins",
      "parentId": null,
      "createdAt": "2025-12-12T11:00:00.000Z",
      "updatedAt": "2025-12-12T11:00:00.000Z"
    },
    "brand": null
  }
}
```

### Réponses d'erreur

| Code | Message | Description |
|------|---------|-------------|
| `400` | `Missing required fields: name, prixVente, prixAchat are required` | Champs obligatoires manquants |
| `400` | `Category is required` | Le `categoryId` est absent |
| `400` | `Category not found` | La catégorie n'existe pas |
| `400` | `Brand not found` | La marque n'existe pas |
| `400` | `SKU already exists` | Le SKU est déjà utilisé |
| `401` | Authentification échouée | Clé API invalide |
| `500` | `Internal server error` | Erreur serveur |

---

## 4️⃣ Marquer une commande comme livrée

### `POST /api/delivery/orders/{orderId}/ext-deliver`

Marque une commande d'approvisionnement comme livrée et déstocke automatiquement le livreur.

### Headers

| Header | Valeur | Requis |
|--------|--------|--------|
| `x-api-key` | Votre clé API | ✅ Oui |
| `Content-Type` | `application/json` | ❌ Non (si query param) |

### Paramètres URL

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `orderId` | `string` | ✅ Oui | ID ou numéro de la commande |

### Query Parameters (alternative au body)

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `driverEmail` | `string` | ✅ Oui | Email du livreur |

### Body (JSON) - Alternative

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `driverEmail` | `string` | ✅ Oui | Email du livreur |
| `amountReceived` | `number` | ❌ Non | Montant reçu |
| `paymentMethod` | `string` | ❌ Non | Mode de paiement |
| `notes` | `string` | ❌ Non | Notes de livraison |

> 💡 Le `driverEmail` peut être passé soit en query parameter (`?driverEmail=xxx`), soit dans le body JSON. Le query parameter a la priorité.

### Exemple de requête (Query Parameter)

```bash
curl -X POST "https://votre-domaine.com/api/delivery/orders/CMD-2025-001/ext-deliver?driverEmail=livreur@example.com" \
  -H "x-api-key: votre-cle-api"
```

### Exemple de requête (Body JSON)

```bash
curl -X POST "https://votre-domaine.com/api/delivery/orders/CMD-2025-001/ext-deliver" \
  -H "x-api-key: votre-cle-api" \
  -H "Content-Type: application/json" \
  -d '{
    "driverEmail": "livreur@example.com",
    "amountReceived": 50000,
    "paymentMethod": "cash",
    "notes": "Livré au client"
  }'
```

### Réponse succès (200)

```json
{
  "success": true,
  "message": "Commande marquée comme livrée (service externe)",
  "data": {
    "id": "clorder123xyz",
    "number": "CMD-2025-001",
    "status": "DELIVERED",
    "deliveredAt": "2025-12-12T14:30:00.000Z"
  }
}
```

### Réponses d'erreur

| Code | Message | Description |
|------|---------|-------------|
| `400` | `Email du livreur requis` | Le `driverEmail` est absent |
| `400` | `Stock insuffisant pour livrer cette commande` | Le livreur n'a pas assez de stock |
| `404` | `Livreur introuvable pour cet email` | Aucun livreur avec cet email |
| `404` | `Commande introuvable` | La commande n'existe pas |
| `500` | `Erreur lors de la confirmation de livraison` | Erreur serveur |

### Exemple d'erreur stock insuffisant

```json
{
  "success": false,
  "error": "Stock insuffisant pour livrer cette commande",
  "details": [
    {
      "productId": "clprod123xyz",
      "productName": "Parfum Yara",
      "requested": 10,
      "available": 3
    }
  ]
}
```

---

## 🔧 Fichier de configuration : `lib/api-key-auth.ts`

Ce fichier contient les fonctions de validation de la clé API.

### Fonctions exportées

#### `validateApiKey(request: NextRequest)`

Vérifie si la requête contient une clé API valide.

**Retourne** :
```typescript
{
  valid: boolean;
  error?: NextResponse;
}
```

#### `requireApiKey(request: NextRequest)`

Middleware helper pour les routes.

**Retourne** :
- `null` si la clé est valide
- `NextResponse` avec l'erreur si invalide

### Utilisation dans une route

```typescript
import { requireApiKey } from "@/lib/api-key-auth"

export async function GET(request: NextRequest) {
  // Vérifier la clé API
  const authError = requireApiKey(request)
  if (authError) return authError

  // Logique de la route...
}
```

---

## 📋 Résumé des codes HTTP

| Code | Signification |
|------|---------------|
| `200` | Succès (GET, PUT, DELETE) |
| `201` | Créé avec succès (POST) |
| `400` | Requête invalide (données manquantes ou incorrectes) |
| `401` | Non authentifié (clé API manquante ou invalide) |
| `404` | Ressource non trouvée |
| `500` | Erreur serveur interne |

---

## 🧪 Exemples de tests avec cURL

### Test authentification

```bash
# Sans clé API (erreur 401)
curl -X GET "http://localhost:3000/api/ext/categories"

# Avec mauvaise clé (erreur 401)
curl -X GET "http://localhost:3000/api/ext/categories" \
  -H "x-api-key: mauvaise-cle"

# Avec bonne clé (succès 200)
curl -X GET "http://localhost:3000/api/ext/categories" \
  -H "x-api-key: votre-vraie-cle"
```

### Workflow complet

```bash
# 1. Créer une catégorie
curl -X POST "http://localhost:3000/api/ext/categories" \
  -H "x-api-key: votre-cle" \
  -H "Content-Type: application/json" \
  -d '{"name": "Ma Catégorie"}'

# 2. Créer un produit dans cette catégorie
curl -X POST "http://localhost:3000/api/ext/products" \
  -H "x-api-key: votre-cle" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Produit",
    "prixVente": 10000,
    "prixAchat": 7000,
    "categoryId": "ID_RETOURNE_ETAPE_1"
  }'
```

---

## 📞 Support

Pour toute question ou problème, contactez l'équipe technique.
