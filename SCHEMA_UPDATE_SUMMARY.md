# Mise à Jour du Schéma Prisma - Récapitulatif Complet

## Vue d'ensemble

Ce document décrit toutes les modifications apportées au schéma Prisma pour supporter:
- ✅ Gestion des magasins multi-sites
- ✅ Produits avec catégories et marques
- ✅ Commandes complètes avec livraison
- ✅ **🆕 Entrepôts et logistique**
- ✅ **🆕 Transferts inter-sites**
- ✅ **🆕 Gestion des lots et péremption**
- ✅ **🆕 Portefeuille livreur**
- ✅ **🆕 Intégration WhatsApp**
- ✅ **🆕 Système de reporting**

## Nouveaux Modèles Ajoutés (Total: 17)

### 1. **Brand (Marques)**
Gestion des marques de produits (optionnel).

```prisma
model Brand {
  id          String    @id @default(cuid())
  name        String    @unique
  description String?
  logo        String?
  website     String?
  isActive    Boolean   @default(true)
  products    Product[]
}
```

**Caractéristiques:**
- Nom unique
- Logo et site web optionnels
- Relation one-to-many avec Product

---

### 2. **StoreProduct (Stock par Magasin)**
Gère le stock spécifique de chaque produit dans chaque magasin.

```prisma
model StoreProduct {
  id        String   @id @default(cuid())
  storeId   String
  productId String
  stock     Int      @default(0)
  minStock  Int      @default(0)
  isActive  Boolean  @default(true)
  
  store     Store    @relation(...)
  product   Product  @relation(...)
  
  @@unique([storeId, productId])
}
```

**Caractéristiques:**
- Un produit peut avoir un stock différent dans chaque magasin
- Seuil d'alerte de stock minimum par magasin
- Contrainte d'unicité sur (storeId, productId)

---

### 3. **StoreContact (Clients par Magasin)**
Associe les contacts/clients aux magasins avec leurs statistiques.

```prisma
model StoreContact {
  id          String   @id @default(cuid())
  storeId     String
  contactId   String
  totalOrders Int      @default(0)
  totalSpent  Float    @default(0)
  lastOrderAt DateTime?
  
  @@unique([storeId, contactId])
}
```

**Caractéristiques:**
- Suivi du nombre de commandes par client et magasin
- Montant total dépensé
- Date de dernière commande

---

### 4. **Order (Commandes Magasin)**
Gestion complète des commandes clients.

```prisma
model Order {
  id                String        @id @default(cuid())
  number            String        @unique
  storeId           String
  contactId         String?       // Optionnel pour walk-in
  customerName      String
  customerPhone     String
  customerEmail     String?
  deliveryAddress   String?
  
  status            OrderStatus   @default(PENDING)
  priority          OrderPriority @default(NORMAL)
  
  subtotal          Float         @default(0)
  totalDiscount     Float         @default(0)
  totalTax          Float         @default(0)
  deliveryFee       Float         @default(0)
  total             Float         @default(0)
  
  paymentMethod     PaymentMethod @default(CASH)
  paymentStatus     PaymentStatus @default(PENDING)
  paidAt            DateTime?
  
  deliveryPersonId  String?
  deliveryZoneId    String?
  estimatedDelivery DateTime?
  deliveredAt       DateTime?
  
  notes             String?
  cancelReason      String?
  
  createdById       String
  items             OrderItem[]
}
```

**Caractéristiques:**
- Numéro de commande unique
- Support des clients walk-in (sans contact enregistré)
- Statuts multiples (pending, confirmed, preparing, ready, delivering, delivered, cancelled)
- Gestion complète du paiement
- Assignation à un livreur et une zone
- Notes et raison d'annulation

---

### 5. **OrderItem (Articles de Commande)**
Détails des articles dans une commande.

```prisma
model OrderItem {
  id        String   @id @default(cuid())
  orderId   String
  productId String
  name      String   // Snapshot au moment de la commande
  sku       String?  // Snapshot du SKU
  quantity  Int
  unitPrice Float
  discount  Float    @default(0)
  taxRate   Float    @default(0)
  total     Float
}
```

**Caractéristiques:**
- Snapshot du nom et SKU au moment de la commande
- Prix unitaire, remise et taxe par article
- Total calculé par ligne

---

### 6. **DeliveryPerson (Livreurs)**
Gestion des livreurs par magasin.

```prisma
model DeliveryPerson {
  id              String               @id @default(cuid())
  storeId         String
  name            String
  phone           String
  email           String?
  avatar          String?
  vehicle         String?
  plateNumber     String?
  status          DeliveryPersonStatus @default(AVAILABLE)
  rating          Float?
  totalDeliveries Int                  @default(0)
  isActive        Boolean              @default(true)
}
```

**Caractéristiques:**
- Informations du véhicule (type et plaque)
- Statut en temps réel (AVAILABLE, BUSY, OFFLINE)
- Note moyenne et nombre total de livraisons
- Un livreur par magasin

---

### 7. **DeliveryZone (Zones de Livraison)**
Définition des zones géographiques de livraison.

```prisma
model DeliveryZone {
  id          String   @id @default(cuid())
  storeId     String
  name        String
  color       String   @default("#3B82F6")
  coverage    String?
  latitude    Float?
  longitude   Float?
  deliveryFee Float    @default(0)
  isActive    Boolean  @default(true)
}
```

**Caractéristiques:**
- Couleur pour affichage sur carte
- Coordonnées GPS du centre de la zone
- Description de la couverture
- Frais de livraison par zone
- Zones liées aux magasins

---

### 8. **🆕 Warehouse (Entrepôt Central)**
Gestion des entrepôts centraux et centres de distribution.

```prisma
model Warehouse {
  id         String    @id @default(cuid())
  name       String
  code       String    @unique
  address    String?
  phone      String?
  managerId  String?   // Responsable d'entrepôt
  isActive   Boolean   @default(true)
}
```

**Caractéristiques:**
- Distinct des magasins (stores)
- Code unique pour identification
- Responsable assigné (User)
- Support multi-entrepôts

---

### 9. **🆕 WarehouseStock (Stock par Entrepôt)**
Stock des produits dans les entrepôts.

```prisma
model WarehouseStock {
  id          String    @id @default(cuid())
  warehouseId String
  productId   String
  quantity    Int       @default(0)
  reserved    Int       @default(0)  // Stock réservé
}
```

**Caractéristiques:**
- Stock séparé par entrepôt
- Quantité réservée pour commandes en cours
- Contrainte d'unicité (warehouse + product)

---

### 10. **🆕 Transfer (Transfert de Stock)**
Transferts entre entrepôts et/ou magasins.

```prisma
model Transfer {
  id              String         @id @default(cuid())
  code            String         @unique
  fromWarehouseId String?
  toWarehouseId   String?
  fromStoreId     String?
  toStoreId       String?
  status          TransferStatus
  scheduledAt     DateTime?
  completedAt     DateTime?
}
```

**Scénarios supportés:**
- Entrepôt → Entrepôt
- Entrepôt → Magasin (réapprovisionnement)
- Magasin → Entrepôt (retour)
- Magasin → Magasin (transfert direct)

---

### 11. **🆕 TransferItem (Articles Transférés)**
Détails des articles dans un transfert.

```prisma
model TransferItem {
  id               String   @id @default(cuid())
  transferId       String
  productId        String
  quantity         Int
  quantityReceived Int?  // Quantité réellement reçue
}
```

**Caractéristiques:**
- Gestion des écarts (envoyé vs reçu)
- Traçabilité complète
- Détection pertes/dommages

---

### 12. **🆕 Lot (Gestion des Lots)**
Traçabilité par lot et dates de péremption.

```prisma
model Lot {
  id            String    @id @default(cuid())
  lotNumber     String    @unique
  productId     String
  quantityTotal Int
  expiryDate    DateTime?
}
```

**Cas d'usage:**
- Produits périssables
- Traçabilité complète (rappels)
- Gestion FIFO/FEFO
- Conformité réglementaire

---

### 13. **🆕 CourierWallet (Portefeuille Livreur)**
Portefeuille électronique pour les livreurs.

```prisma
model CourierWallet {
  id            String     @id @default(cuid())
  courierId     String     @unique
  balance       Float      @default(0)
  currency      String     @default("XAF")
}
```

**Fonctionnalités:**
- Solde en temps réel
- Multi-devises
- Un portefeuille par livreur

---

### 14. **🆕 CourierTransaction (Transactions Livreur)**
Historique des transactions du portefeuille.

```prisma
model CourierTransaction {
  id          String          @id @default(cuid())
  walletId    String
  type        TransactionType  // CREDIT ou DEBIT
  amount      Float
  description String?
  reference   String?
}
```

**Types de transactions:**
- CREDIT: Paiement cash collecté, bonus
- DEBIT: Commission, retrait, pénalité

---

### 15. **🆕 WhatsAppMessage (Messages WhatsApp)**
Intégration WhatsApp pour commandes automatiques.

```prisma
model WhatsAppMessage {
  id            String                @id @default(cuid())
  waId          String                @unique
  fromPhone     String
  content       String
  messageType   String                @default("text")
  status        WhatsAppMessageStatus
  orderId       String?
}
```

**Workflow:**
1. Réception message → NEW
2. Analyse IA → PROCESSING
3. Commande créée → PROCESSED
4. Confirmation → REPLIED

---

### 16. **🆕 Report (Rapports)**
Système de génération de rapports.

```prisma
model Report {
  id          String       @id @default(cuid())
  name        String
  type        ReportType   // SALES, INVENTORY, etc.
  status      ReportStatus
  parameters  Json?
  result      Json?
  fileUrl     String?      // PDF/Excel généré
}
```

**Types de rapports:**
- Ventes par période
- Inventaire et stock
- Performances livraisons
- Rapports financiers
- Rapports personnalisés

---

## Modèles Modifiés

### **Product (Produit)**
Modifications apportées:
- ✅ Ajout du champ `sku` (unique, optionnel)
- ✅ Ajout du champ `minStock` (seuil d'alerte)
- ✅ Ajout du champ `maxStock` (optionnel)
- ✅ `categoryId` devient **obligatoire** (non-nullable)
- ✅ Ajout de `brandId` (optionnel)
- ✅ Relations ajoutées: `storeProducts[]`, `orderItems[]`

### **Store (Magasin)**
Relations ajoutées:
- ✅ `products` → StoreProduct[]
- ✅ `orders` → Order[]
- ✅ `deliveryPersons` → DeliveryPerson[]
- ✅ `deliveryZones` → DeliveryZone[]
- ✅ `storeContacts` → StoreContact[]

### **Contact**
Relations ajoutées:
- ✅ `storeContacts` → StoreContact[]
- ✅ `orders` → Order[]

### **User**
Relations ajoutées:
- ✅ `orders` → Order[]

---

## Nouveaux Enums

### **OrderStatus**
Statuts de commande:
```prisma
enum OrderStatus {
  PENDING      // En attente
  CONFIRMED    // Confirmée
  PREPARING    // En préparation
  READY        // Prête
  DELIVERING   // En livraison
  DELIVERED    // Livrée
  CANCELLED    // Annulée
}
```

### **OrderPriority**
Priorités de commande:
```prisma
enum OrderPriority {
  NORMAL   // Normale
  HIGH     // Élevée
  URGENT   // Urgente
}
```

### **PaymentMethod**
Méthodes de paiement:
```prisma
enum PaymentMethod {
  CASH           // Espèces
  CARD           // Carte bancaire
  MOBILE         // Mobile Money
  BANK_TRANSFER  // Virement bancaire
}
```

### **PaymentStatus**
Statuts de paiement:
```prisma
enum PaymentStatus {
  PENDING   // En attente
  PAID      // Payé
  FAILED    // Échoué
  REFUNDED  // Remboursé
}
```

### **DeliveryPersonStatus**
Statuts des livreurs:
```prisma
enum DeliveryPersonStatus {
  AVAILABLE  // Disponible
  BUSY       // Occupé
  OFFLINE    // Hors ligne
}
```

---

## Modèles Existants Conservés

Les modèles suivants restent inchangés:
- ✅ **Contact** - Gestion des contacts CRM
- ✅ **ProductCategory** - Catégories de produits avec sous-catégories
- ✅ **StockMovement** - Mouvements de stock
- ✅ **Quote/QuoteItem** - Devis
- ✅ **Invoice/InvoiceItem** - Factures
- ✅ **Opportunity** - Opportunités commerciales
- ✅ **Task** - Tâches
- ✅ **AuditLog** - Logs d'activités (compatible avec tous les nouveaux modèles)
- ✅ **User/Role/Permission** - Gestion des utilisateurs et permissions

---

## Relations Clés

### Relation Store ↔ Product (Many-to-Many)
Via `StoreProduct`:
- Un magasin peut avoir plusieurs produits
- Un produit peut être dans plusieurs magasins
- Stock géré indépendamment par magasin

### Relation Order ↔ Product (Many-to-Many)
Via `OrderItem`:
- Une commande contient plusieurs articles
- Un produit peut être dans plusieurs commandes
- Snapshot des informations produit au moment de la commande

### Relation Store → Orders
- Un magasin peut avoir plusieurs commandes
- Une commande appartient à un seul magasin

### Relation DeliveryPerson → Orders
- Un livreur peut avoir plusieurs commandes
- Une commande peut être assignée à un seul livreur

### Relation DeliveryZone → Orders
- Une zone peut avoir plusieurs commandes
- Une commande peut être assignée à une seule zone

---

## Fonctionnalités Supportées

### ✅ Gestion des Stores
- Création et gestion de plusieurs magasins
- Informations détaillées (logo, couverture, contact)
- Statut actif/inactif

### ✅ Gestion Produits
- **Catégories** - Organisation hiérarchique (obligatoire)
- **Marques** - Association optionnelle
- **SKU** - Code produit unique
- **Stock** - Gestion global + par magasin
- **Seuils** - Alerte stock minimum et maximum
- **Photos** - Tableau d'URLs
- **Pricing** - Prix vente, achat, TVA

### ✅ Gestion Contacts/Clients
- Contacts CRM existants
- Association aux magasins via StoreContact
- Statistiques par magasin (commandes, montant dépensé)
- Support des clients walk-in (sans enregistrement)

### ✅ Gestion Commandes
- Cycle de vie complet (7 statuts)
- Priorités (normale, élevée, urgente)
- Paiements multiples méthodes
- Livraison (adresse, frais, estimation)
- Assignation livreur et zone
- Articles détaillés avec snapshot
- Notes et raisons d'annulation

### ✅ Gestion Livreurs
- Informations personnelles et véhicule
- Statut temps réel
- Historique et statistiques
- Note moyenne
- Assignation par magasin

### ✅ Zones de Livraison
- Définition géographique (coordonnées GPS)
- Affichage carte (couleur, couverture)
- Frais de livraison par zone
- Gestion active/inactive

### ✅ Logs d'Activité
- AuditLog existant compatible
- Tracking de toutes les actions (CREATE, UPDATE, DELETE)
- Snapshot JSON des modifications
- Traçabilité complète

---

## Prochaines Étapes

1. **Migration de la base de données**
   ```bash
   npx prisma migrate dev --name add_store_features
   ```

2. **Génération du client Prisma**
   ```bash
   npx prisma generate
   ```

3. **Seed (optionnel)**
   Créer des données de test pour:
   - Marques
   - Produits liés aux catégories
   - StoreProducts
   - Zones de livraison
   - Livreurs

4. **Mise à jour des API Routes**
   Créer les endpoints pour:
   - `/api/stores/[id]/products`
   - `/api/stores/[id]/orders`
   - `/api/stores/[id]/delivery-persons`
   - `/api/stores/[id]/delivery-zones`
   - `/api/brands`

5. **Tests**
   - Vérifier les contraintes d'intégrité
   - Tester les cascades de suppression
   - Valider les relations many-to-many

---

## Remarques Importantes

⚠️ **Breaking Changes:**
- `Product.categoryId` est maintenant **obligatoire** (non-nullable)
- Vous devrez assigner une catégorie à tous les produits existants avant la migration

✅ **Rétrocompatibilité:**
- Tous les modèles existants sont préservés
- Les relations existantes fonctionnent toujours
- AuditLog compatible avec les nouveaux modèles

💡 **Optimisations:**
- Index automatiques sur foreign keys
- Contraintes d'unicité pour éviter les doublons
- Cascades de suppression configurées correctement

---

## Schéma Complet

Le schéma Prisma complet est disponible dans:
`/prisma/schema.prisma`

Total des modèles: **24 modèles**
Total des enums: **13 enums**

---

Généré le: 12 octobre 2025
