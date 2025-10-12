# Diagramme des Relations - Schéma Prisma

## Vue d'Ensemble des Entités Principales

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GESTION DES MAGASINS                        │
└─────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  Store   │
                              │          │
                              │ - name   │
                              │ - logo   │
                              │ - address│
                              └────┬─────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
        ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
        │StoreProduct  │   │   Order      │  │DeliveryPerson│
        │              │   │              │  │              │
        │- stock       │   │- number      │  │- name        │
        │- minStock    │   │- status      │  │- vehicle     │
        └──────┬───────┘   └──────┬───────┘  │- status      │
               │                  │           │- rating      │
               │                  │           └──────────────┘
               ▼                  ▼
        ┌──────────────┐   ┌──────────────┐
        │   Product    │   │  OrderItem   │
        │              │   │              │
        │- sku         │   │- quantity    │
        │- name        │◄──┤- unitPrice   │
        │- prixVente   │   │- total       │
        └──────────────┘   └──────────────┘
```

---

## Relations Store (Magasin)

```
                    ┌────────────────┐
                    │     Store      │
                    │                │
                    │ id, name,      │
                    │ address, phone │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┬────────────────┐
        │                    │                    │                │
        ▼                    ▼                    ▼                ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐    ┌──────────┐
  │StoreProdu│        │  Order   │        │Delivery  │    │Delivery  │
  │   ct     │        │          │        │ Person   │    │  Zone    │
  └──────────┘        └──────────┘        └──────────┘    └──────────┘
  (Many-to-        (One-to-Many)      (One-to-Many)    (One-to-Many)
   Many via
   Product)
        │
        │
        ▼
  ┌──────────┐
  │StoreContr│
  │   act    │
  └──────────┘
  (Many-to-
   Many via
   Contact)
```

---

## Relations Product (Produit)

```
┌──────────────────────────────────────────────────────┐
│                      Product                         │
│                                                      │
│ id, sku, name, description, photos                  │
│ prixVente, prixAchat, tva, stock                    │
│ minStock, maxStock                                   │
└──┬────────┬──────────┬──────────┬────────────┬──────┘
   │        │          │          │            │
   │(M)     │(M)       │(M)       │(M)         │(1)
   │        │          │          │            │
   ▼        ▼          ▼          ▼            ▼
┌──────┐ ┌──────┐  ┌──────┐  ┌──────┐    ┌──────────┐
│Quote │ │Invoic│  │Order │  │Store │    │ Category │ (REQUIRED)
│Item  │ │eItem │  │Item  │  │Produc│    │          │
└──────┘ └──────┘  └──────┘  │t     │    │ - name   │
                             └──────┘    │ - parent │
                                         └──────────┘
   │                                            │(1)
   │(M)                                         │
   ▼                                            ▼
┌──────────┐                              ┌──────────┐
│  Stock   │                              │  Brand   │ (OPTIONAL)
│ Movement │                              │          │
└──────────┘                              │ - name   │
                                          │ - logo   │
                                          └──────────┘
```

**Légende:**
- **(M)** = Many (plusieurs)
- **(1)** = One (un seul)

---

## Flux de Commande (Order Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                      CYCLE DE VIE D'UNE COMMANDE                │
└─────────────────────────────────────────────────────────────────┘

    [Client]
       │
       ▼
  ┌─────────────┐
  │   Contact   │ (Optional - peut être walk-in)
  │             │
  │ - firstName │
  │ - phone     │
  │ - email     │
  └──────┬──────┘
         │
         │ creates
         ▼
  ┌─────────────────────────────────────┐
  │           Order                     │
  │                                     │
  │ Status Flow:                        │
  │ PENDING → CONFIRMED → PREPARING     │
  │   → READY → DELIVERING → DELIVERED  │
  │        (or CANCELLED)               │
  │                                     │
  │ Priority: NORMAL | HIGH | URGENT    │
  │                                     │
  │ Payment:                            │
  │ - method: CASH/CARD/MOBILE          │
  │ - status: PENDING/PAID/FAILED       │
  └──────┬──────────────┬───────────────┘
         │              │
         │(1)           │(M)
         │              │
         ▼              ▼
  ┌──────────┐    ┌──────────────┐
  │Delivery  │    │  OrderItem   │
  │Person    │    │              │
  │          │    │ - product    │
  │- status  │    │ - quantity   │
  │- vehicle │    │ - unitPrice  │
  │- rating  │    │ - discount   │
  └────┬─────┘    │ - total      │
       │          └──────────────┘
       │
       │ assigned to
       ▼
  ┌──────────────┐
  │DeliveryZone  │
  │              │
  │ - name       │
  │ - coverage   │
  │ - lat/lng    │
  │ - fee        │
  └──────────────┘
```

---

## Relations Contact (Client)

```
                    ┌────────────────┐
                    │    Contact     │
                    │                │
                    │ - firstName    │
                    │ - lastName     │
                    │ - email        │
                    │ - phone        │
                    │ - type         │
                    │ - status       │
                    └────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┬────────────┐
        │                    │                    │            │
        ▼                    ▼                    ▼            ▼
  ┌──────────┐        ┌──────────┐        ┌──────────┐  ┌──────────┐
  │StoreContr│        │  Order   │        │  Quote   │  │ Invoice  │
  │   act    │        │          │        │          │  │          │
  │          │        │(Optional)│        │          │  │          │
  │- total   │        └──────────┘        └──────────┘  └──────────┘
  │  Orders  │
  │- total   │        ┌──────────┐
  │  Spent   │        │Opportuni-│
  │- last    │        │   ty     │
  │  OrderAt │        └──────────┘
  └──────────┘
```

---

## Hiérarchie des Catégories

```
┌─────────────────────────────────────────────────┐
│         ProductCategory (Self-Referencing)      │
└─────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   Électronique   │ (parent)
    └────────┬─────────┘
             │
      ┌──────┴──────┬──────────┬──────────┐
      │             │          │          │
      ▼             ▼          ▼          ▼
┌──────────┐  ┌──────────┐ ┌────────┐ ┌────────┐
│ Laptops  │  │ Téléphone│ │ Tablet │ │ Audio  │ (subcategories)
└──────────┘  └──────────┘ └────────┘ └────────┘
      │
      │ categoryId (REQUIRED)
      ▼
┌──────────────────────┐
│     Products         │
│                      │
│ - MacBook Air M2     │
│ - Dell XPS 15        │
│ - Lenovo ThinkPad    │
└──────────────────────┘
```

---

## Gestion Stock

```
┌─────────────────────────────────────────────────────────────┐
│                    GESTION DU STOCK                         │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Product    │
                    │              │
                    │ - stock      │ (stock global)
                    │ - minStock   │
                    │ - maxStock   │
                    └──────┬───────┘
                           │
                ┌──────────┼──────────┐
                │                     │
                ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │StoreProduct  │      │StockMovement │
        │              │      │              │
        │- stock       │      │- quantity    │
        │  (per store) │      │- type        │
        │- minStock    │      │- note        │
        │  (per store) │      │- user        │
        └──────────────┘      └──────────────┘
                              
        StockType:
        - ENTRY (Entrée)
        - EXIT (Sortie)
        - ADJUSTMENT (Ajustement)
        - SALE (Vente)
        - RETURN (Retour)
```

---

## Modèle de Sécurité et Audit

```
┌─────────────────────────────────────────────────────────────┐
│              SÉCURITÉ, PERMISSIONS & AUDIT                  │
└─────────────────────────────────────────────────────────────┘

    ┌──────────────┐
    │     User     │
    │              │
    │ - email      │
    │ - password   │
    │ - status     │
    └──────┬───────┘
           │
    ┌──────┴──────┬──────────────┬────────────────┐
    │             │              │                │
    ▼             ▼              ▼                ▼
┌─────────┐  ┌─────────┐   ┌─────────┐     ┌──────────┐
│UserRole │  │ Contact │   │  Order  │     │AuditLog  │
└────┬────┘  │(Assigned│   │(Created)│     │          │
     │       │   To)   │   └─────────┘     │- action  │
     │       └─────────┘                   │- entity  │
     ▼                                     │- payload │
┌─────────────┐                            │- user    │
│    Role     │                            └──────────┘
│             │
│ - name      │
│ - isSystem  │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ RolePermission  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Permission    │
│                 │
│ - name          │
│ - module        │
│ - action        │
└─────────────────┘

Modules supportés:
- stores
- products
- orders
- contacts
- delivery
- etc.
```

---

## Résumé des Cardinalités

| Relation | Type | Description |
|----------|------|-------------|
| Store → StoreProduct | 1:M | Un magasin a plusieurs produits |
| Product → StoreProduct | 1:M | Un produit dans plusieurs magasins |
| Store → Order | 1:M | Un magasin a plusieurs commandes |
| Order → OrderItem | 1:M | Une commande a plusieurs articles |
| Product → OrderItem | 1:M | Un produit dans plusieurs commandes |
| Store → DeliveryPerson | 1:M | Un magasin a plusieurs livreurs |
| Store → DeliveryZone | 1:M | Un magasin a plusieurs zones |
| DeliveryPerson → Order | 1:M | Un livreur a plusieurs commandes |
| DeliveryZone → Order | 1:M | Une zone a plusieurs commandes |
| Contact → Order | 1:M | Un contact a plusieurs commandes |
| Product → Brand | M:1 | Plusieurs produits d'une marque |
| Product → Category | M:1 | Plusieurs produits d'une catégorie |
| Category → Category | M:1 | Hiérarchie parent/enfant |
| Store → StoreContact | 1:M | Un magasin a plusieurs clients |
| Contact → StoreContact | 1:M | Un contact dans plusieurs magasins |

---

## Légende des Symboles

- `─►` : Relation one-to-many
- `◄─►` : Relation many-to-many
- `(M)` : Multiple (Many)
- `(1)` : Single (One)
- `(Optional)` : Champ nullable
- `(Required)` : Champ obligatoire

---

Généré le: 12 octobre 2025
