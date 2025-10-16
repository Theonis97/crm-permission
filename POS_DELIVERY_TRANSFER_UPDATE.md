# Mise à Jour du POS - Transfert de Stock aux Livreurs

## 🎯 Objectif

Modifier le système de point de vente (POS) pour permettre deux types de transactions :
1. **Client Direct** : Commande client avec livraison ou retrait
2. **Transfert Livreur** : Transfert de stock du magasin vers un livreur

## ✅ Fonctionnalités Implémentées

### 1. **Nouvelle Étape de Sélection du Type de Transaction**

Au moment de valider le panier, l'utilisateur voit maintenant une **étape 0** avec deux options en mode card :

```
┌─────────────────────────────────────────────────┐
│          Type de transaction                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐       ┌──────────────┐       │
│  │ 👤 Client    │       │ 🚚 Livreur   │       │
│  │   Direct     │       │              │       │
│  │              │       │              │       │
│  │ ✓ Commande   │       │ ✓ Stock      │       │
│  │ ✓ Livraison  │       │ ✓ Mouvement  │       │
│  │ ✓ Facturation│       │ ✓ Rapide     │       │
│  └──────────────┘       └──────────────┘       │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2. **Flux Client Direct (Inchangé)**

Si l'utilisateur sélectionne **Client Direct**, le flux reste le même :

```
Étape 0: Sélection du type (CLIENT)
    ↓
Étape 1: Informations client
    ↓
Étape 2: Adresse de livraison
    ↓
Étape 3: Mode de paiement
    ↓
Création de la commande
```

### 3. **Nouveau Flux Transfert Livreur**

Si l'utilisateur sélectionne **Transfert Livreur**, le flux est simplifié :

```
Étape 0: Sélection du type (DRIVER)
    ↓
Étape 1: Sélection du livreur
    ↓
Validation immédiate
    ↓
Transfert de stock automatique
```

#### Interface de Sélection du Livreur

```tsx
┌─────────────────────────────────────────────────┐
│  📋 Transfert de stock au livreur                │
├─────────────────────────────────────────────────┤
│                                                  │
│  Sélectionner le livreur *                      │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ JM  Jacques Mballa    [Disponible]     ✓ │  │
│  │     +241 0X XX XX 111                     │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ PM  Pierre Martin     [Occupé]            │  │
│  │     +241 0X XX XX 222                     │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Notes (optionnel)                              │
│  [Ex: Stock pour la tournée du matin...]        │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 📊 Récapitulatif du transfert            │   │
│  │                                           │   │
│  │ Nombre d'articles:        15              │   │
│  │ Valeur totale:       125,000 FCFA         │   │
│  │ Livreur:         Jacques Mballa           │   │
│  │                                           │   │
│  │ ℹ️ Mouvements automatiques :              │   │
│  │ • Magasin : Sortie de stock enregistrée  │   │
│  │ • Livreur : Entrée de stock enregistrée  │   │
│  └─────────────────────────────────────────┘   │
│                                                  │
│  [Retour]              [Transférer au livreur]  │
└─────────────────────────────────────────────────┘
```

## 🔄 Flux de Données Technique

### Transfert de Stock au Livreur

```typescript
// 1. Front-end (POS Page)
const handleTransferToDriver = async () => {
  const transferData = {
    deliveryPersonId: selectedDeliveryPerson,
    items: cart.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
    })),
    notes: notes || "Transfert de stock depuis POS",
  }

  const response = await fetch(
    `/api/delivery-persons/${selectedDeliveryPerson}/stock`,
    {
      method: "POST",
      body: JSON.stringify(transferData),
    }
  )
}
```

```typescript
// 2. API - /api/delivery-persons/[id]/stock (POST)
// Accepte maintenant un tableau d'items

interface TransferRequest {
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
  }>
  notes?: string
}

// OU pour un seul produit (rétrocompatibilité)
interface SingleProductRequest {
  productId: string
  variantId?: string | null
  quantity: number
  notes?: string
}
```

### Transaction Automatique

Pour chaque produit transféré, l'API effectue une **transaction atomique** :

```
┌────────────────────────────────────────────┐
│         TRANSACTION PRISMA                  │
├────────────────────────────────────────────┤
│                                             │
│  Pour chaque produit dans items:           │
│                                             │
│  1️⃣ Réduire le stock du magasin            │
│     StoreProduct.stock -= quantity          │
│                                             │
│  2️⃣ Augmenter le stock du livreur           │
│     DeliveryPersonStock.quantity += qty     │
│                                             │
│  3️⃣ Créer mouvement ENTRANT (livreur)       │
│     DeliveryStockMovement.type = "SUPPLY"   │
│                                             │
│  4️⃣ Créer mouvement SORTANT (magasin)       │
│     StockMovement.type = "EXIT"             │
│     StockMovement.quantity = -quantity      │
│                                             │
└────────────────────────────────────────────┘
```

Si **UNE SEULE** opération échoue, **TOUT** est annulé (rollback).

## 📊 Structure des Données

### Requête API

```json
POST /api/delivery-persons/{deliveryPersonId}/stock

{
  "items": [
    {
      "productId": "prod_123",
      "variantId": null,
      "quantity": 10
    },
    {
      "productId": "prod_456",
      "variantId": "var_789",
      "quantity": 5
    }
  ],
  "notes": "Stock pour la tournée du matin"
}
```

### Réponse API

```json
{
  "success": true,
  "transferred": 2,
  "items": [
    {
      "id": "deliv_stock_1",
      "deliveryPersonId": "driver_123",
      "productId": "prod_123",
      "quantity": 10,
      "product": {
        "id": "prod_123",
        "name": "Coca Cola 50cl",
        "prixVente": 500
      }
    },
    {
      "id": "deliv_stock_2",
      "deliveryPersonId": "driver_123",
      "productId": "prod_456",
      "quantity": 5,
      "product": {
        "id": "prod_456",
        "name": "Eau minérale 1.5L",
        "prixVente": 300
      }
    }
  ],
  "message": "2 produit(s) transféré(s) avec succès au livreur Jacques Mballa"
}
```

## 🔍 Validation et Sécurité

### Validations Côté API

✅ **Authentification** : Session utilisateur requise
✅ **Livreur existe** : Vérifie que le livreur existe et appartient au magasin
✅ **Produits existent** : Vérifie que tous les produits existent dans le stock du magasin
✅ **Stock suffisant** : Vérifie que le magasin a assez de stock pour chaque produit
✅ **Quantités valides** : Toutes les quantités doivent être > 0
✅ **Transaction atomique** : Tout réussit ou tout échoue

### Messages d'Erreur

```typescript
// Stock insuffisant
{
  "error": "Stock insuffisant pour le produit prod_123. Disponible: 5, Demandé: 10"
}

// Produit introuvable
{
  "error": "Produit prod_456 non trouvé dans le stock du magasin"
}

// Livreur introuvable
{
  "error": "Livreur non trouvé"
}
```

## 🎨 Améliorations UI/UX

### 1. **Cards Interactives**

Les deux options (Client Direct / Transfert Livreur) sont présentées sous forme de **grandes cards cliquables** avec :
- Icône distinctive (👤 pour Client, 🚚 pour Livreur)
- Titre clair
- Description explicative
- Liste des avantages
- Animation hover

### 2. **Indicateurs Visuels**

- Badge de statut du livreur (Disponible / Occupé)
- Checkmark ✓ sur le livreur sélectionné
- Récapitulatif en temps réel (nombre d'articles, valeur)
- Info-box explicative des mouvements automatiques

### 3. **Navigation Intelligente**

- **Client** : 3 étapes (Client → Livraison → Paiement)
- **Livreur** : 1 étape (Sélection → Validation)
- Bouton "Retour" pour revenir à la sélection du type
- Boutons contextuels selon le type :
  - Client : "Suivant" → "Créer la commande"
  - Livreur : "Transférer au livreur"

## 📝 Fichiers Modifiés

### 1. **Page POS**
**Fichier** : `/app/dashboard/stores/[id]/pos/page.tsx`

**Changements** :
- ✅ Ajout état `orderType: "CLIENT" | "DRIVER" | null`
- ✅ Modification `checkoutStep` : commence à 0 au lieu de 1
- ✅ Ajout étape 0 : Sélection du type
- ✅ Nouvelle fonction `handleTransferToDriver()`
- ✅ Modification `handleCreateOrder()` : route selon le type
- ✅ Nouvelle fonction `canSubmitDriverOrder()`
- ✅ UI conditionnelle selon `orderType`
- ✅ Boutons de navigation adaptatifs

### 2. **API Stock Livreur**
**Fichier** : `/app/api/delivery-persons/[id]/stock/route.ts`

**Changements** :
- ✅ Support de `items[]` pour transfert multiple
- ✅ Rétrocompatibilité avec `productId, quantity` unique
- ✅ Validation de tous les produits avant transaction
- ✅ Boucle sur `items` dans la transaction
- ✅ Réponse enrichie avec détails du transfert

## 🚀 Guide d'Utilisation

### Scénario 1 : Transfert de Stock au Livreur

1. **Ajouter des produits au panier** dans le POS
2. **Cliquer sur "Valider la commande"**
3. **Sélectionner "Transfert Livreur"**
4. **Choisir le livreur** dans la liste
5. **Optionnel** : Ajouter des notes
6. **Cliquer sur "Transférer au livreur"**

✅ **Résultat** :
- Stock du magasin réduit
- Stock du livreur augmenté
- 2 mouvements de stock enregistrés (sortie magasin + entrée livreur)
- Toast de confirmation
- Panier vidé
- Produits rechargés avec nouveaux stocks

### Scénario 2 : Commande Client (Inchangé)

1. **Ajouter des produits au panier**
2. **Cliquer sur "Valider la commande"**
3. **Sélectionner "Client Direct"**
4. **Étape 1** : Informations client
5. **Étape 2** : Adresse de livraison
6. **Étape 3** : Mode de paiement
7. **Cliquer sur "Créer la commande"**

## 📈 Avantages

### Pour le Magasin

✅ **Traçabilité totale** : Chaque transfert est enregistré
✅ **Gestion de stock précise** : Mouvements automatiques
✅ **Rapidité** : Transfert en 1 clic vs 3 étapes pour une commande
✅ **Flexibilité** : Support de plusieurs produits en une fois

### Pour le Livreur

✅ **Stock personnel** : Chaque livreur a son propre inventaire
✅ **Autonomie** : Peut vendre directement depuis son stock
✅ **Visibilité** : Historique complet de ses approvisionnements

### Pour le Système

✅ **Cohérence** : Transaction atomique (tout ou rien)
✅ **Performance** : Traitement en batch des produits
✅ **Maintenabilité** : Code modulaire et réutilisable
✅ **Rétrocompatibilité** : L'ancienne API fonctionne toujours

## 🔮 Évolutions Futures Possibles

- [ ] Validation du livreur (accepter/refuser le transfert)
- [ ] Limite de stock par livreur
- [ ] Scan QR code pour identifier le livreur
- [ ] Notification push au livreur lors du transfert
- [ ] Rapport de transferts par période
- [ ] Export PDF du bon de transfert
- [ ] Signature électronique du livreur

## 🐛 Gestion des Erreurs

### Côté Front

```typescript
try {
  await handleTransferToDriver()
  toast.success("Stock transféré avec succès !")
} catch (error) {
  toast.error(error.message || "Erreur lors du transfert")
}
```

### Côté API

- **401** : Non authentifié
- **404** : Livreur ou produit non trouvé
- **400** : Validation échouée (stock insuffisant, quantité invalide)
- **500** : Erreur serveur

## 📊 Exemple de Mouvements Enregistrés

### Dans `DeliveryStockMovement`

```sql
INSERT INTO DeliveryStockMovement (
  deliveryPersonId,
  productId,
  type,
  quantity,
  notes,
  createdById
) VALUES (
  'driver_123',
  'prod_456',
  'SUPPLY',
  10,
  'Transfert depuis POS',
  'user_789'
);
```

### Dans `StockMovement`

```sql
INSERT INTO StockMovement (
  productId,
  quantity,
  type,
  note,
  userId
) VALUES (
  'prod_456',
  -10,
  'EXIT',
  'Transfert au livreur: Jacques Mballa',
  'user_789'
);
```

---

**Date de mise à jour** : 15 octobre 2025  
**Statut** : ✅ Fonctionnel et testé  
**Version** : 1.0.0
