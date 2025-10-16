# Système de Gestion du Stock des Livreurs

## Vue d'ensemble

Le système de gestion du stock des livreurs permet de traiter les livreurs comme des mini-magasins mobiles avec leur propre inventaire. Chaque livreur peut avoir un stock de produits qu'il transporte et peut vendre directement aux clients.

## Concept Clé

**Le livreur a un double rôle :**
- Un **mini-magasin mobile** avec son propre stock de marchandises
- Un **client** du magasin principal qui prélève des produits du stock

## Règles de Gestion

### 1. Approvisionnement du Livreur
- Le livreur prend des produits du stock du magasin principal
- Cela crée un **mouvement de stock sortant** pour le magasin
- Cela crée un **mouvement de stock entrant** pour le livreur (type: `SUPPLY`)
- Le système trace automatiquement ces mouvements

### 2. Gestion du Stock du Livreur
- Chaque livreur maintient son propre inventaire de marchandises
- Le système suit :
  - Quantité totale en stock
  - Quantité réservée (pour commandes en cours)
  - Quantité disponible = total - réservé

### 3. Attribution des Commandes Clients
- Les commandes clients sont attribuées aux livreurs selon :
  - La **zone de livraison** du livreur
  - La **disponibilité des produits** dans le stock du livreur
- Le livreur DOIT avoir la marchandise en stock pour recevoir l'attribution

### 4. Traçabilité
Le magasin peut suivre :
- Tous les prélèvements effectués par chaque livreur
- Le stock actuel de chaque livreur
- Les ventes effectuées par chaque livreur
- Les retours au magasin

## Modifications du Schéma Prisma

### Nouveaux Modèles

#### 1. `DeliveryPersonStock`
Gère le stock par livreur et par produit.

```prisma
model DeliveryPersonStock {
  id               String   @id @default(cuid())
  deliveryPersonId String
  productId        String
  variantId        String?
  quantity         Int      @default(0)
  reserved         Int      @default(0)
  // Relations...
}
```

#### 2. `DeliveryStockMovement`
Trace tous les mouvements de stock des livreurs.

```prisma
model DeliveryStockMovement {
  id               String                     @id @default(cuid())
  deliveryPersonId String
  productId        String
  variantId        String?
  type             DeliveryStockMovementType  // SUPPLY, SALE, RETURN, ADJUSTMENT
  quantity         Int
  storeOrderId     String?
  notes            String?
  createdById      String?
  createdAt        DateTime
  // Relations...
}
```

#### 3. Enum `DeliveryStockMovementType`
```prisma
enum DeliveryStockMovementType {
  SUPPLY       // Approvisionnement depuis le magasin
  SALE         // Vente à un client
  RETURN       // Retour au magasin
  ADJUSTMENT   // Ajustement de stock
}
```

## APIs Créées

### 1. Gestion du Stock du Livreur

#### `GET /api/delivery-persons/[id]/stock`
Récupère le stock actuel d'un livreur avec résumé (total items, valeur totale, etc.)

#### `POST /api/delivery-persons/[id]/stock`
Ajoute du stock au livreur (approvisionnement depuis le magasin)

**Body:**
```json
{
  "productId": "string",
  "variantId": "string?",
  "quantity": number,
  "notes": "string?"
}
```

**Validation automatique:**
- Vérifie la disponibilité dans le stock du magasin
- Réduit automatiquement le stock du magasin
- Augmente le stock du livreur
- Crée les mouvements de traçabilité

### 2. Mouvements de Stock

#### `GET /api/delivery-persons/[id]/stock/movements`
Récupère l'historique des mouvements de stock d'un livreur

**Query params:**
- `type`: Filtrer par type (SUPPLY, SALE, RETURN, ADJUSTMENT)
- `limit`: Nombre de résultats (défaut: 50)
- `offset`: Pagination

#### `POST /api/delivery-persons/[id]/stock/movements`
Crée un mouvement manuel (RETURN ou ADJUSTMENT)

**Body:**
```json
{
  "productId": "string",
  "variantId": "string?",
  "type": "RETURN" | "ADJUSTMENT",
  "quantity": number,
  "notes": "string?"
}
```

**Comportement:**
- `RETURN`: Retourne le stock au magasin (quantité positive)
- `ADJUSTMENT`: Ajuste le stock (+/- selon la quantité)

### 3. Mouvements par Magasin

#### `GET /api/stores/[id]/delivery-movements`
Récupère tous les mouvements de stock des livreurs d'un magasin

#### `GET /api/stores/[id]/stock/movements`
Récupère les mouvements de stock du magasin principal

## Interfaces Utilisateur

### 1. Page Détail du Livreur (`/dashboard/stores/[id]/drivers/[driverId]`)

#### Onglet "Stock"
- **Résumé du stock :**
  - Total articles en stock
  - Valeur totale du stock
  - Nombre de produits différents

- **Actions disponibles :**
  - **Approvisionner** : Ajouter du stock depuis le magasin
  - **Retour / Ajustement** : Mouvements manuels

- **Liste du stock :**
  - Produit et variante
  - Quantité totale
  - Quantité réservée
  - Quantité disponible
  - Prix unitaire et valeur totale

#### Onglet "Historique"
- Liste de tous les mouvements de stock du livreur
- Filtrage et recherche
- Détails complets (type, quantité, commande associée, utilisateur)

### 2. Page Mouvements (`/dashboard/stores/[id]/movements`)

#### Onglets améliorés :
- **Stock Magasin** : Mouvements du magasin principal
- **Stock Livreurs** : Mouvements de tous les livreurs du magasin

#### Statistiques :
- Total mouvements
- Entrées / Sorties / Ajustements
- Mouvements livreurs

#### Filtres :
- Recherche par produit ou livreur
- Filtrage par type de mouvement
- Pagination

## Helpers de Validation

### `lib/delivery-stock-validator.ts`

#### `validateDeliveryPersonStock(deliveryPersonId, items)`
Valide que le livreur a suffisamment de stock pour une commande.

**Retourne:**
```typescript
{
  valid: boolean,
  insufficientItems?: Array<{
    productId: string,
    productName: string,
    required: number,
    available: number,
    missing: number
  }>,
  message: string
}
```

#### `reserveDeliveryPersonStock(deliveryPersonId, items)`
Réserve le stock du livreur pour une commande (incrémente `reserved`).

#### `releaseDeliveryPersonStock(deliveryPersonId, items)`
Libère le stock réservé (en cas d'annulation).

#### `consumeDeliveryPersonStock(deliveryPersonId, orderId, items, userId)`
Consomme le stock après livraison :
- Réduit la quantité totale
- Réduit la quantité réservée
- Crée un mouvement de type SALE

#### `getDeliveryPersonAvailableStock(deliveryPersonId)`
Obtient un résumé du stock disponible du livreur.

## Workflow Complet

### Scénario : Attribution d'une Commande Client

1. **Client passe une commande** via le magasin

2. **Validation du stock du livreur**
   ```typescript
   const validation = await validateDeliveryPersonStock(deliveryPersonId, orderItems)
   if (!validation.valid) {
     // Informer que le livreur n'a pas assez de stock
     return { error: validation.message, items: validation.insufficientItems }
   }
   ```

3. **Réservation du stock**
   ```typescript
   await reserveDeliveryPersonStock(deliveryPersonId, orderItems)
   ```

4. **Attribution de la commande** au livreur

5. **Livraison effectuée**
   ```typescript
   await consumeDeliveryPersonStock(deliveryPersonId, orderId, orderItems, userId)
   ```
   - Le stock du livreur est réduit
   - Un mouvement SALE est créé
   - La commande est marquée comme livrée

6. **En cas d'annulation**
   ```typescript
   await releaseDeliveryPersonStock(deliveryPersonId, orderItems)
   ```

## Migration et Déploiement

### Étapes de Migration

1. **Appliquer le schéma Prisma**
   ```bash
   npx prisma migrate dev --name add_delivery_stock_system
   ```

2. **Générer le client Prisma**
   ```bash
   npx prisma generate
   ```

3. **Initialiser le stock des livreurs existants**
   - Optionnel : créer un script de migration pour initialiser le stock à 0

### Vérifications Post-Déploiement

- [ ] Vérifier que les tables sont créées : `delivery_person_stocks`, `delivery_stock_movements`
- [ ] Tester l'approvisionnement d'un livreur
- [ ] Tester l'attribution d'une commande avec validation du stock
- [ ] Vérifier les mouvements de stock dans la page Movements
- [ ] Tester les retours et ajustements

## Cas d'Usage

### 1. Approvisionner un Livreur en Début de Journée
- Manager du magasin va dans le profil du livreur
- Onglet "Stock" → Bouton "Approvisionner"
- Sélectionne les produits et quantités
- Le système valide la disponibilité et effectue le transfert

### 2. Attribuer une Commande Client
- Le système vérifie automatiquement le stock du livreur
- Si insuffisant, affiche les produits manquants
- Si OK, réserve le stock et attribue la commande

### 3. Retour en Fin de Journée
- Livreur retourne les produits non vendus
- Manager va dans le profil du livreur
- Onglet "Stock" → Bouton "Retour / Ajustement"
- Type: Retour → Sélectionne produits et quantités
- Le stock revient automatiquement au magasin

### 4. Suivi des Mouvements
- Manager accède à `/dashboard/stores/[id]/movements`
- Onglet "Stock Livreurs" pour voir tous les mouvements
- Filtrage et recherche pour analyses

## Avantages du Système

✅ **Traçabilité complète** : Chaque mouvement est enregistré
✅ **Contrôle du stock** : Impossible d'attribuer une commande sans stock
✅ **Autonomie des livreurs** : Peuvent vendre directement depuis leur stock
✅ **Gestion simplifiée** : Interface intuitive pour toutes les opérations
✅ **Rapports précis** : Statistiques détaillées par livreur et par période
✅ **Prévention des pertes** : Stock réservé empêche les surcommitments

## Support et Maintenance

Pour toute question ou problème :
- Vérifier les logs des APIs concernées
- Vérifier l'intégrité des données dans la base
- S'assurer que les migrations Prisma sont appliquées

## TODO / Améliorations Futures

- [ ] Ajouter des notifications quand le stock d'un livreur est bas
- [ ] Générer des rapports de performance par livreur
- [ ] Ajouter une vue graphique de l'évolution du stock
- [ ] Implémenter des alertes pour les produits périmés
- [ ] Ajouter la gestion des emballages/contenants
