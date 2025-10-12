# Guide de Migration - Nouveau Schéma Prisma

## ⚠️ Important - À lire avant de migrer

Ce guide vous accompagne dans la migration du schéma Prisma vers la nouvelle version supportant la gestion complète des magasins, produits, commandes, livreurs et zones de livraison.

---

## Prérequis

- ✅ Base de données PostgreSQL accessible
- ✅ Backup de la base de données existante
- ✅ Variables d'environnement configurées (`.env`)
- ✅ Dépendances installées (`npm install`)

---

## Étape 1: Backup de la Base de Données

**Très important:** Créez un backup avant toute migration!

```bash
# PostgreSQL
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Via Docker (si vous utilisez Docker)
docker exec -t postgres_container pg_dump -U your_user your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Étape 2: Vérification du Schéma

Le schéma a déjà été validé ✅

```bash
npx prisma validate
```

---

## Étape 3: ⚠️ Breaking Change - Catégories Obligatoires

### Problème
`Product.categoryId` est maintenant **obligatoire** (non-nullable).

### Solution

**Option A: Si vous avez déjà des produits sans catégorie**

1. Créez une catégorie par défaut:

```sql
-- Créer une catégorie "Non catégorisé"
INSERT INTO product_categories (id, name, description, created_at, updated_at)
VALUES ('default-category-id', 'Non catégorisé', 'Produits sans catégorie', NOW(), NOW());
```

2. Assignez cette catégorie à tous les produits sans catégorie:

```sql
-- Mettre à jour les produits sans catégorie
UPDATE products
SET category_id = 'default-category-id'
WHERE category_id IS NULL;
```

**Option B: Si vous n'avez pas encore de produits**

Rien à faire, passez à l'étape suivante.

---

## Étape 4: Créer la Migration

```bash
npx prisma migrate dev --name add_store_management_features
```

Cette commande va:
1. Créer les nouvelles tables
2. Ajouter les nouveaux enums
3. Créer les relations (foreign keys)
4. Créer les index automatiques
5. Appliquer les contraintes d'unicité

**Durée estimée:** 1-3 minutes selon la taille de la base

---

## Étape 5: Générer le Client Prisma

```bash
npx prisma generate
```

Cela va générer les types TypeScript pour tous les nouveaux modèles.

---

## Étape 6: Vérification Post-Migration

### Vérifier les tables créées

```bash
npx prisma studio
```

Ouvrez Prisma Studio et vérifiez que toutes les nouvelles tables sont présentes:

- ✅ `brands`
- ✅ `store_products`
- ✅ `store_contacts`
- ✅ `orders`
- ✅ `order_items`
- ✅ `delivery_persons`
- ✅ `delivery_zones`

### Vérifier les relations

Testez quelques requêtes pour vérifier les relations:

```typescript
// Test des relations Store
const store = await prisma.store.findFirst({
  include: {
    products: true,
    orders: true,
    deliveryPersons: true,
    deliveryZones: true,
  }
})

// Test des relations Product
const product = await prisma.product.findFirst({
  include: {
    category: true,
    brand: true,
    storeProducts: true,
  }
})

// Test des relations Order
const order = await prisma.order.findFirst({
  include: {
    items: {
      include: {
        product: true
      }
    },
    store: true,
    deliveryPerson: true,
    deliveryZone: true,
  }
})
```

---

## Étape 7: Seed des Données de Test (Optionnel)

Créez un fichier `prisma/seed.ts`:

```typescript
import { PrismaClient, OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Créer des catégories
  const electronique = await prisma.productCategory.create({
    data: {
      name: 'Électronique',
      description: 'Appareils électroniques',
    }
  })

  const telephonie = await prisma.productCategory.create({
    data: {
      name: 'Téléphonie',
      description: 'Smartphones et accessoires',
      parentId: electronique.id,
    }
  })

  // 2. Créer des marques
  const apple = await prisma.brand.create({
    data: {
      name: 'Apple',
      description: 'Apple Inc.',
      website: 'https://www.apple.com',
    }
  })

  const samsung = await prisma.brand.create({
    data: {
      name: 'Samsung',
      description: 'Samsung Electronics',
      website: 'https://www.samsung.com',
    }
  })

  // 3. Créer des produits
  const iphone = await prisma.product.create({
    data: {
      name: 'iPhone 14 Pro',
      sku: 'IPH-14-PRO-128',
      description: 'iPhone 14 Pro 128GB',
      prixVente: 850000,
      prixAchat: 700000,
      tva: 19.25,
      stock: 20,
      minStock: 5,
      categoryId: telephonie.id,
      brandId: apple.id,
      photos: ['https://example.com/iphone.jpg'],
    }
  })

  const galaxy = await prisma.product.create({
    data: {
      name: 'Samsung Galaxy S23',
      sku: 'SAM-S23-256',
      description: 'Galaxy S23 256GB',
      prixVente: 680000,
      prixAchat: 550000,
      tva: 19.25,
      stock: 15,
      minStock: 5,
      categoryId: telephonie.id,
      brandId: samsung.id,
      photos: ['https://example.com/galaxy.jpg'],
    }
  })

  // 4. Créer un magasin
  const store = await prisma.store.create({
    data: {
      name: 'Magasin Centre-Ville',
      address: '123 Rue Principale, Libreville',
      phone: '+241 01 23 45 67',
      email: 'contact@store.ga',
      isActive: true,
    }
  })

  // 5. Ajouter les produits au magasin
  await prisma.storeProduct.createMany({
    data: [
      {
        storeId: store.id,
        productId: iphone.id,
        stock: 10,
        minStock: 3,
      },
      {
        storeId: store.id,
        productId: galaxy.id,
        stock: 8,
        minStock: 3,
      },
    ]
  })

  // 6. Créer des zones de livraison
  await prisma.deliveryZone.createMany({
    data: [
      {
        storeId: store.id,
        name: 'Libreville Centre',
        color: '#3B82F6',
        coverage: 'Centre-ville, Montagne Sainte, Louis',
        latitude: 0.4162,
        longitude: 9.4673,
        deliveryFee: 2000,
      },
      {
        storeId: store.id,
        name: 'Akanda',
        color: '#10B981',
        coverage: 'Akanda, Zone industrielle',
        latitude: 0.5500,
        longitude: 9.4500,
        deliveryFee: 3000,
      },
    ]
  })

  // 7. Créer des livreurs
  await prisma.deliveryPerson.createMany({
    data: [
      {
        storeId: store.id,
        name: 'Jacques Mballa',
        phone: '+241 06 12 34 56',
        email: 'jacques@delivery.ga',
        vehicle: 'Moto Yamaha',
        plateNumber: 'LBV-1234-AB',
        rating: 4.8,
      },
      {
        storeId: store.id,
        name: 'Marie Ngono',
        phone: '+241 06 23 45 67',
        email: 'marie@delivery.ga',
        vehicle: 'Moto Honda',
        plateNumber: 'LBV-5678-CD',
        rating: 4.9,
      },
    ]
  })

  console.log('✅ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

Ajouter dans `package.json`:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Exécuter le seed:

```bash
npx prisma db seed
```

---

## Étape 8: Mettre à Jour les API Routes

Créez les nouveaux endpoints API dans `app/api/`:

### Structure recommandée

```
app/api/
├── brands/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       └── route.ts          # GET, PATCH, DELETE
├── stores/
│   └── [id]/
│       ├── products/
│       │   └── route.ts      # GET, POST
│       ├── orders/
│       │   ├── route.ts      # GET, POST
│       │   └── [orderId]/
│       │       └── route.ts  # GET, PATCH, DELETE
│       ├── delivery-persons/
│       │   └── route.ts      # GET, POST
│       └── delivery-zones/
│           └── route.ts      # GET, POST
```

---

## Étape 9: Tester les Permissions

Vérifiez que les permissions existent pour les nouveaux modules:

```sql
-- Ajouter les permissions pour les stores
INSERT INTO permissions (id, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'stores.view', 'Voir les magasins', 'stores', 'view', NOW()),
  (gen_random_uuid(), 'stores.create', 'Créer des magasins', 'stores', 'create', NOW()),
  (gen_random_uuid(), 'stores.update', 'Modifier des magasins', 'stores', 'update', NOW()),
  (gen_random_uuid(), 'stores.delete', 'Supprimer des magasins', 'stores', 'delete', NOW());

-- Ajouter les permissions pour les commandes
INSERT INTO permissions (id, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'orders.view', 'Voir les commandes', 'orders', 'view', NOW()),
  (gen_random_uuid(), 'orders.create', 'Créer des commandes', 'orders', 'create', NOW()),
  (gen_random_uuid(), 'orders.update', 'Modifier des commandes', 'orders', 'update', NOW()),
  (gen_random_uuid(), 'orders.delete', 'Supprimer des commandes', 'orders', 'delete', NOW());

-- etc.
```

---

## Rollback (En cas de problème)

Si quelque chose ne va pas, vous pouvez revenir en arrière:

### Option 1: Restaurer le backup

```bash
psql -U your_user -d your_database < backup_file.sql
```

### Option 2: Reset complet (⚠️ DANGER - perte de données)

```bash
npx prisma migrate reset
```

---

## Checklist Finale

Avant de passer en production:

- [ ] Backup créé et testé
- [ ] Migration appliquée sans erreur
- [ ] Client Prisma généré
- [ ] Toutes les tables créées
- [ ] Relations fonctionnelles
- [ ] Seed exécuté (optionnel)
- [ ] Permissions configurées
- [ ] API routes créées
- [ ] Tests écrits et passants
- [ ] Documentation mise à jour

---

## Support et Dépannage

### Erreur: "Foreign key constraint failed"

**Cause:** Des données existantes violent les nouvelles contraintes.

**Solution:** Nettoyez les données incohérentes avant la migration.

### Erreur: "Column already exists"

**Cause:** Migration déjà partiellement appliquée.

**Solution:** 
```bash
npx prisma migrate resolve --rolled-back migration_name
```

### Erreur: "Type does not exist"

**Cause:** Les enums PostgreSQL ne sont pas créés.

**Solution:** Relancer la migration ou créer manuellement:
```sql
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', ...);
```

---

## Ressources

- [Documentation Prisma](https://www.prisma.io/docs)
- [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)

---

Créé le: 12 octobre 2025
Version: 1.0.0
