# Plan d'Action - Mise en Production du Schéma Complet

## 🎯 Objectif

Déployer le nouveau schéma Prisma avec:
- ✅ **Phase 1:** Commerce (magasins, produits, commandes, livraisons)
- ✅ **Phase 2:** Logistique (entrepôts, transferts, lots, portefeuille, WhatsApp, rapports)

---

## ✅ État Actuel

- [x] Schéma Prisma mis à jour et validé ✅
- [x] Documentation complète créée (6 documents)
- [x] Exemples de requêtes fournis (50+)
- [x] Fonctionnalités logistiques ajoutées ✅
- [ ] Migration appliquée
- [ ] Tests créés
- [ ] APIs implémentées
- [ ] Interface utilisateur ajustée
- [ ] Intégration WhatsApp configurée
- [ ] Jobs de reporting créés

---

## 📋 Plan d'Action Étape par Étape

### Phase 1: Préparation (1-2 heures)

#### ✅ Étape 1.1: Backup de la base de données
```bash
# PostgreSQL
pg_dump -U your_user -d your_database > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### ✅ Étape 1.2: Vérifier l'environnement
- [ ] Vérifier `.env` (DATABASE_URL)
- [ ] Tester la connexion à la base de données
- [ ] S'assurer que tous les paquets sont à jour

```bash
npm install
npx prisma validate
```

#### ✅ Étape 1.3: Gérer le breaking change (si nécessaire)
Si vous avez des produits sans catégorie, exécutez:

```sql
-- Créer une catégorie par défaut
INSERT INTO product_categories (id, name, description, created_at, updated_at)
VALUES ('default-cat', 'Non catégorisé', 'Produits sans catégorie', NOW(), NOW());

-- Assigner aux produits sans catégorie
UPDATE products
SET category_id = 'default-cat'
WHERE category_id IS NULL;
```

---

### Phase 2: Migration (30 minutes)

#### ✅ Étape 2.1: Créer la migration
```bash
npx prisma migrate dev --name add_store_management_features
```

**Vérifier:**
- [ ] Migration créée sans erreur
- [ ] Toutes les tables créées
- [ ] Relations/Foreign keys créées

#### ✅ Étape 2.2: Générer le client Prisma
```bash
npx prisma generate
```

#### ✅ Étape 2.3: Vérifier avec Prisma Studio
```bash
npx prisma studio
```

**Vérifier que ces tables existent:**
- [ ] brands
- [ ] store_products
- [ ] store_contacts
- [ ] orders
- [ ] order_items
- [ ] delivery_persons
- [ ] delivery_zones

---

### Phase 3: Seed des Données de Test (1 heure)

#### ✅ Étape 3.1: Créer le fichier de seed
Copiez le code du fichier `MIGRATION_GUIDE.md` section "Seed des Données de Test"

Créez: `prisma/seed.ts`

#### ✅ Étape 3.2: Configurer package.json
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

#### ✅ Étape 3.3: Exécuter le seed
```bash
npx prisma db seed
```

**Vérifier dans Prisma Studio:**
- [ ] Catégories créées
- [ ] Marques créées
- [ ] Produits créés avec relations
- [ ] Magasin créé
- [ ] StoreProducts créés
- [ ] Zones de livraison créées
- [ ] Livreurs créés

---

### Phase 4: Créer les API Routes (3-4 heures)

#### ✅ Étape 4.1: Structure des dossiers

Créez la structure suivante:

```
app/api/
├── brands/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
├── stores/
│   └── [id]/
│       ├── products/
│       │   └── route.ts
│       ├── orders/
│       │   ├── route.ts
│       │   └── [orderId]/
│       │       └── route.ts
│       ├── delivery-persons/
│       │   ├── route.ts
│       │   └── [personId]/
│       │       └── route.ts
│       └── delivery-zones/
│           ├── route.ts
│           └── [zoneId]/
│               └── route.ts
```

#### ✅ Étape 4.2: Implémenter les routes prioritaires

**Priorité 1 (Essentielles):**
- [ ] `GET /api/stores/[id]/products` - Liste produits
- [ ] `POST /api/stores/[id]/orders` - Créer commande
- [ ] `GET /api/stores/[id]/orders` - Liste commandes
- [ ] `PATCH /api/stores/[id]/orders/[orderId]` - Mettre à jour commande

**Priorité 2 (Importantes):**
- [ ] `GET /api/stores/[id]/delivery-persons` - Liste livreurs
- [ ] `GET /api/stores/[id]/delivery-zones` - Liste zones
- [ ] `GET /api/brands` - Liste marques
- [ ] `POST /api/stores/[id]/products` - Ajouter produit au magasin

**Priorité 3 (Nice to have):**
- [ ] Toutes les autres routes CRUD

#### ✅ Étape 4.3: Exemple de route (Référence)

```typescript
// app/api/stores/[id]/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = params.id
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        ...(status && { status: status as any }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                photos: true,
              }
            }
          }
        },
        deliveryPerson: true,
        deliveryZone: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const storeId = params.id
    const body = await request.json()

    // Valider les données...

    const order = await prisma.order.create({
      data: {
        number: `CMD-${Date.now()}`,
        storeId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        deliveryAddress: body.deliveryAddress,
        subtotal: body.subtotal,
        total: body.total,
        paymentMethod: body.paymentMethod,
        createdById: session.user.id,
        items: {
          create: body.items,
        },
      },
      include: {
        items: true,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

### Phase 5: Ajuster les Pages Existantes (2-3 heures)

#### ✅ Étape 5.1: Pages à mettre à jour

**Déjà créées (à vérifier/ajuster):**
- [ ] `app/dashboard/stores/page.tsx` - ✅ Déjà OK
- [ ] `app/dashboard/stores/[id]/page.tsx` - ✅ Déjà OK
- [ ] `app/dashboard/stores/[id]/products/page.tsx` - Connecter à l'API
- [ ] `app/dashboard/stores/[id]/orders/page.tsx` - Connecter à l'API
- [ ] `app/dashboard/stores/[id]/drivers/page.tsx` - Connecter à l'API
- [ ] `app/dashboard/stores/[id]/zones/page.tsx` - ✅ Déjà OK

**À créer:**
- [ ] `app/dashboard/stores/[id]/brands/page.tsx`
- [ ] `app/dashboard/stores/[id]/categories/page.tsx`

#### ✅ Étape 5.2: Remplacer les données mockées

Dans chaque page, remplacer:

```typescript
// ❌ Avant
const mockOrders = [...]

// ✅ Après
const [orders, setOrders] = useState([])

useEffect(() => {
  fetch(`/api/stores/${storeId}/orders`)
    .then(res => res.json())
    .then(data => setOrders(data))
}, [storeId])
```

Ou utiliser SWR/React Query:

```typescript
import useSWR from 'swr'

const { data: orders, error, isLoading } = useSWR(
  `/api/stores/${storeId}/orders`,
  fetcher
)
```

---

### Phase 6: Tests (2-3 heures)

#### ✅ Étape 6.1: Tests Unitaires (Prisma)

Créez: `__tests__/prisma/orders.test.ts`

```typescript
import { prisma } from '@/lib/prisma'

describe('Order Management', () => {
  it('should create an order with items', async () => {
    const order = await prisma.order.create({
      data: {
        number: 'TEST-001',
        storeId: 'test-store',
        customerName: 'Test Customer',
        customerPhone: '+241 06 00 00 00',
        total: 100000,
        createdById: 'test-user',
        items: {
          create: [
            {
              productId: 'test-product',
              name: 'Test Product',
              quantity: 1,
              unitPrice: 100000,
              total: 100000,
            }
          ]
        }
      },
      include: { items: true }
    })

    expect(order.items.length).toBe(1)
    expect(order.total).toBe(100000)
  })

  // Plus de tests...
})
```

#### ✅ Étape 6.2: Tests E2E (Playwright)

Créez: `e2e/orders.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Order Management', () => {
  test('should create a new order', async ({ page }) => {
    await page.goto('/dashboard/stores/1/orders')
    
    await page.click('text=Nouvelle commande')
    await page.fill('[name="customerName"]', 'Jean Dupont')
    await page.fill('[name="customerPhone"]', '+241 06 12 34 56')
    
    // Ajouter des produits...
    
    await page.click('text=Créer la commande')
    
    await expect(page.locator('.success-message')).toBeVisible()
  })
})
```

#### ✅ Étape 6.3: Checklist des tests manuels

- [ ] Créer un magasin
- [ ] Ajouter des produits au magasin
- [ ] Créer une commande
- [ ] Assigner un livreur
- [ ] Marquer comme livré
- [ ] Annuler une commande
- [ ] Vérifier les stats
- [ ] Tester les filtres
- [ ] Tester la recherche
- [ ] Vérifier les permissions

---

### Phase 7: Permissions et Sécurité (1-2 heures)

#### ✅ Étape 7.1: Ajouter les permissions

```sql
-- Stores
INSERT INTO permissions (id, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'stores.view', 'Voir les magasins', 'stores', 'view', NOW()),
  (gen_random_uuid(), 'stores.create', 'Créer des magasins', 'stores', 'create', NOW()),
  (gen_random_uuid(), 'stores.update', 'Modifier des magasins', 'stores', 'update', NOW()),
  (gen_random_uuid(), 'stores.delete', 'Supprimer des magasins', 'stores', 'delete', NOW());

-- Orders
INSERT INTO permissions (id, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'orders.view', 'Voir les commandes', 'orders', 'view', NOW()),
  (gen_random_uuid(), 'orders.create', 'Créer des commandes', 'orders', 'create', NOW()),
  (gen_random_uuid(), 'orders.update', 'Modifier des commandes', 'orders', 'update', NOW()),
  (gen_random_uuid(), 'orders.cancel', 'Annuler des commandes', 'orders', 'cancel', NOW());

-- Delivery
INSERT INTO permissions (id, name, description, module, action, created_at)
VALUES 
  (gen_random_uuid(), 'delivery.view', 'Voir les livraisons', 'delivery', 'view', NOW()),
  (gen_random_uuid(), 'delivery.assign', 'Assigner des livreurs', 'delivery', 'assign', NOW());
```

#### ✅ Étape 7.2: Assigner aux rôles

```sql
-- Récupérer l'ID du rôle Admin
SELECT id FROM roles WHERE name = 'Admin';

-- Assigner toutes les permissions au rôle Admin
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT gen_random_uuid(), 'ROLE_ADMIN_ID', id, NOW()
FROM permissions
WHERE module IN ('stores', 'orders', 'delivery');
```

#### ✅ Étape 7.3: Protéger les routes API

Ajouter dans chaque route:

```typescript
import { checkPermission } from '@/lib/permissions'

// Dans la fonction handler
const hasPermission = await checkPermission(session.user.id, 'orders.create')
if (!hasPermission) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

---

### Phase 8: Documentation et Formation (1 heure)

#### ✅ Étape 8.1: Documentation interne

- [ ] Créer un README pour l'équipe
- [ ] Documenter les workflows
- [ ] Créer des vidéos de démo (optionnel)

#### ✅ Étape 8.2: Formation utilisateurs

- [ ] Préparer un guide utilisateur
- [ ] Organiser une session de formation
- [ ] Créer une FAQ

---

### Phase 9: Déploiement Production (1 heure)

#### ✅ Étape 9.1: Vérifications pré-production

- [ ] Tous les tests passent
- [ ] Pas d'erreurs TypeScript
- [ ] Build réussit
- [ ] Variables d'environnement production configurées

```bash
npm run build
npm run lint
npx tsc --noEmit
```

#### ✅ Étape 9.2: Déploiement

1. **Backup production:**
```bash
# Connectez-vous à la prod et faites un backup
pg_dump -U prod_user -d prod_database > prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

2. **Appliquer la migration:**
```bash
# Sur le serveur de production
npx prisma migrate deploy
```

3. **Déployer le code:**
```bash
git push production main
# Ou selon votre processus de déploiement
```

4. **Vérifier:**
- [ ] Application démarre
- [ ] Pas d'erreurs dans les logs
- [ ] Base de données accessible
- [ ] Fonctionnalités de base marchent

#### ✅ Étape 9.3: Monitoring post-déploiement

- [ ] Surveiller les logs (premières 24h)
- [ ] Vérifier les performances
- [ ] Recueillir les feedbacks utilisateurs
- [ ] Corriger les bugs si nécessaire

---

## 📊 Résumé du Temps Estimé

### Phase 1 - Commerce (Base)
| Phase | Durée estimée | Priorité |
|-------|---------------|----------|
| Phase 1: Préparation | 1-2h | 🔴 Critique |
| Phase 2: Migration | 30min | 🔴 Critique |
| Phase 3: Seed | 1h | 🟡 Important |
| Phase 4: API Routes (Commerce) | 3-4h | 🔴 Critique |
| Phase 5: Pages (Commerce) | 2-3h | 🔴 Critique |
| Phase 6: Tests | 2-3h | 🟡 Important |
| Phase 7: Permissions | 1-2h | 🟢 Recommandé |
| Phase 8: Documentation | 1h | 🟢 Recommandé |
| Phase 9: Déploiement | 1h | 🔴 Critique |

**Sous-total Phase 1: 12-18 heures**

### Phase 2 - Logistique (Avancé) 🆕
| Phase | Durée estimée | Priorité |
|-------|---------------|----------|
| Phase 10: API Entrepôts & Transferts | 3-4h | 🔴 Critique |
| Phase 11: API Lots & Traçabilité | 2h | 🟡 Important |
| Phase 12: Portefeuille Livreur | 2-3h | 🔴 Critique |
| Phase 13: Intégration WhatsApp | 4-5h | 🔴 Critique |
| Phase 14: Système de Rapports | 3-4h | 🟡 Important |
| Phase 15: Pages Logistique | 3-4h | 🟢 Recommandé |
| Phase 16: Tests Logistique | 2-3h | 🟡 Important |
| Phase 17: Background Jobs | 2-3h | 🔴 Critique |

**Sous-total Phase 2: 21-30 heures**

### **TOTAL COMPLET: 33-48 heures de développement**

---

## 🎯 Priorités par Sprint

### Sprint 1 - MVP Commerce (12h)
**Objectif:** Base fonctionnelle commerce
1. Migration de la base
2. API Routes essentielles (commandes, produits, magasins)
3. Connecter les pages existantes aux APIs
4. Tests manuels basiques
5. Déploiement staging

### Sprint 2 - Commerce Complet (6h)
**Objectif:** Fonctionnalités commerce complètes
1. API Routes complètes (zones, livreurs)
2. Tests automatisés
3. Permissions configurées
4. Documentation utilisateur

### Sprint 3 - Logistique Core (15h)
**Objectif:** Entrepôts et transferts
1. Modèles entrepôts et transferts
2. API Routes logistique
3. Pages gestion entrepôt
4. Tests transferts
5. Dashboard logistique

### Sprint 4 - Automatisation (12h)
**Objectif:** WhatsApp et portefeuille
1. Intégration WhatsApp Business API
2. Webhook et traitement messages
3. Système portefeuille livreur
4. API transactions
5. Tests e2e WhatsApp

### Sprint 5 - Analytics (8h)
**Objectif:** Rapports et lots
1. Système de rapports
2. Background jobs (Bull/BullMQ)
3. Gestion des lots
4. Alertes péremption
5. Export PDF/Excel

### Sprint 6 - Production (5h)
**Objectif:** Mise en production
1. Review code complet
2. Tests de charge
3. Déploiement production
4. Monitoring et alerting
5. Formation équipe

---

## 📞 Support

En cas de problème:

1. **Consulter:**
   - `MIGRATION_GUIDE.md` - Guide détaillé
   - `PRISMA_QUERIES_EXAMPLES.md` - Exemples de code
   - `SCHEMA_DIAGRAM.md` - Visualisation

2. **Vérifier:**
   - Les logs Prisma
   - Les erreurs TypeScript
   - La console navigateur

3. **Ressources:**
   - [Documentation Prisma](https://www.prisma.io/docs)
   - [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

---

Bon courage! 🚀

Créé le: 12 octobre 2025
