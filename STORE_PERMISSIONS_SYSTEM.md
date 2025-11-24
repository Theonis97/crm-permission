# Système de Rôles et Permissions au Niveau des Magasins

## 🎯 Objectif

Ce système permet de gérer les rôles et permissions spécifiques à chaque magasin, offrant une gestion décentralisée et granulaire des accès aux fonctionnalités de chaque magasin.

## 🏗️ Architecture Implémentée

### 1. Base de Données

#### Nouveaux Modèles Prisma

```prisma
model StoreRole {
  id          String   @id @default(cuid())
  name        String   // Ex: "Manager", "Vendeur", "Caissier"
  description String?
  storeId     String   @map("store_id")
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  store                Store                 @relation(fields: [storeId], references: [id], onDelete: Cascade)
  storeUserRoles       StoreUserRole[]
  storeRolePermissions StoreRolePermission[]

  @@unique([name, storeId])
  @@map("store_roles")
}

model StorePermission {
  id          String   @id @default(cuid())
  name        String   @unique // Ex: "store.products.view", "store.pos.access"
  description String?
  module      String   // Ex: "products", "pos", "orders"
  action      String   // Ex: "view", "create", "edit", "delete"
  createdAt   DateTime @default(now()) @map("created_at")

  storeRolePermissions StoreRolePermission[]

  @@map("store_permissions")
}

model StoreUserRole {
  id         String   @id @default(cuid())
  userId     String   @map("user_id")
  storeId    String   @map("store_id")
  roleId     String   @map("role_id")
  assignedBy String   @map("assigned_by")
  assignedAt DateTime @default(now()) @map("assigned_at")

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  store          Store     @relation(fields: [storeId], references: [id], onDelete: Cascade)
  role           StoreRole @relation(fields: [roleId], references: [id], onDelete: Cascade)
  assignedByUser User      @relation("StoreRoleAssignedBy", fields: [assignedBy], references: [id])

  @@unique([userId, storeId, roleId])
  @@map("store_user_roles")
}

model StoreRolePermission {
  id           String   @id @default(cuid())
  roleId       String   @map("role_id")
  permissionId String   @map("permission_id")
  createdAt    DateTime @default(now()) @map("created_at")

  role       StoreRole       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission StorePermission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@unique([roleId, permissionId])
  @@map("store_role_permissions")
}
```

### 2. APIs REST

#### Routes Créées

- `GET /api/stores/[id]/roles` - Liste des rôles du magasin
- `POST /api/stores/[id]/roles` - Créer un nouveau rôle
- `GET /api/stores/[id]/roles/[roleId]` - Détails d'un rôle
- `PUT /api/stores/[id]/roles/[roleId]` - Modifier un rôle
- `DELETE /api/stores/[id]/roles/[roleId]` - Supprimer un rôle
- `GET /api/stores/[id]/permissions` - Liste des permissions disponibles
- `GET /api/stores/[id]/users` - Utilisateurs du magasin avec leurs rôles
- `POST /api/stores/[id]/users` - Inviter un utilisateur au magasin
- `GET /api/stores/[id]/users/[userId]/roles` - Rôles d'un utilisateur
- `PUT /api/stores/[id]/users/[userId]/roles` - Modifier les rôles d'un utilisateur
- `GET /api/stores/[id]/users/[userId]/permissions` - Permissions d'un utilisateur
- `POST /api/stores/[id]/init-permissions` - Initialiser les permissions par défaut

### 3. Composants Frontend

#### Hook `useStorePermissions`

```typescript
const { 
  permissions, 
  roles, 
  hasStoreAccess, 
  hasStorePermission, 
  hasAnyStorePermission, 
  hasAllStorePermissions,
  refreshPermissions 
} = useStorePermissions(storeId)
```

#### Composant `StorePermissionGuard`

```tsx
<StorePermissionGuard 
  storeId={storeId} 
  permission={STORE_PERMISSIONS.PRODUCTS_VIEW}
  fallback={<div>Accès refusé</div>}
>
  <ProductsSection />
</StorePermissionGuard>
```

### 4. Permissions Définies

#### Modules et Permissions

- **Dashboard** : `store.dashboard.view`
- **Produits** : `store.products.view`, `store.products.create`, `store.products.edit`, `store.products.delete`, `store.products.stock`
- **Catégories** : `store.categories.view`, `store.categories.manage`
- **Marques** : `store.brands.view`, `store.brands.manage`
- **Commandes** : `store.orders.view`, `store.orders.create`, `store.orders.edit`, `store.orders.cancel`, `store.orders.fulfill`
- **Point de Vente** : `store.pos.access`, `store.pos.sell`, `store.pos.refund`
- **Contacts** : `store.contacts.view`, `store.contacts.create`, `store.contacts.edit`, `store.contacts.delete`
- **Livreurs** : `store.drivers.view`, `store.drivers.manage`, `store.drivers.assign`
- **Zones** : `store.zones.view`, `store.zones.manage`
- **Mouvements** : `store.movements.view`, `store.movements.create`
- **Administration** : `store.users.view`, `store.users.invite`, `store.users.roles`, `store.settings.edit`

### 5. Rôles Par Défaut

#### Manager
- **Description** : Accès complet au magasin
- **Permissions** : Toutes les permissions du magasin

#### Vendeur
- **Description** : Vente et gestion basique
- **Permissions** : 
  - `store.dashboard.view`
  - `store.products.view`
  - `store.pos.access`
  - `store.pos.sell`
  - `store.contacts.view`
  - `store.contacts.create`
  - `store.orders.view`
  - `store.orders.create`

#### Caissier
- **Description** : Accès caisse uniquement
- **Permissions** :
  - `store.pos.access`
  - `store.pos.sell`
  - `store.products.view`
  - `store.contacts.view`

#### Gestionnaire Stock
- **Description** : Gestion des produits et stock
- **Permissions** :
  - `store.dashboard.view`
  - `store.products.view`
  - `store.products.edit`
  - `store.products.stock`
  - `store.categories.view`
  - `store.brands.view`
  - `store.movements.view`
  - `store.movements.create`

## 🚀 Utilisation

### 1. Initialisation d'un Magasin

```bash
POST /api/stores/{storeId}/init-permissions
```

Cette route crée automatiquement :
- Toutes les permissions de base (si elles n'existent pas)
- Les 4 rôles par défaut pour le magasin
- Assigne le rôle "Manager" au manager du magasin (si défini)

### 2. Protection d'une Page

```tsx
export default function ProductsPage() {
  const params = useParams()
  const storeId = params.id as string

  return (
    <StorePermissionGuard 
      storeId={storeId} 
      permission={STORE_PERMISSIONS.PRODUCTS_VIEW}
    >
      <div>
        <h1>Produits</h1>
        
        <StorePermissionGuard 
          storeId={storeId} 
          permission={STORE_PERMISSIONS.PRODUCTS_CREATE}
          fallback={null}
        >
          <Button>Créer un produit</Button>
        </StorePermissionGuard>
      </div>
    </StorePermissionGuard>
  )
}
```

### 3. Vérification de Permissions

```tsx
const { hasStorePermission } = useStorePermissions(storeId)

if (hasStorePermission(STORE_PERMISSIONS.PRODUCTS_EDIT)) {
  // Afficher le bouton de modification
}
```

## 📁 Fichiers Créés

### Backend
- `prisma/schema.prisma` - Modèles de base de données (mis à jour)
- `app/api/stores/[id]/roles/route.ts` - Gestion des rôles
- `app/api/stores/[id]/roles/[roleId]/route.ts` - Gestion d'un rôle spécifique
- `app/api/stores/[id]/permissions/route.ts` - Liste des permissions
- `app/api/stores/[id]/users/route.ts` - Gestion des utilisateurs du magasin
- `app/api/stores/[id]/users/[userId]/roles/route.ts` - Rôles d'un utilisateur
- `app/api/stores/[id]/users/[userId]/permissions/route.ts` - Permissions d'un utilisateur
- `app/api/stores/[id]/init-permissions/route.ts` - Initialisation des permissions

### Frontend
- `hooks/use-store-permissions.ts` - Hook pour les permissions magasin
- `components/auth/store-permission-guard.tsx` - Composant de protection
- `types/store-auth.ts` - Types TypeScript
- `app/dashboard/stores/[id]/users/page.tsx` - Interface de gestion des utilisateurs
- `app/dashboard/stores/[id]/test-permissions/page.tsx` - Page de test et d'initialisation
- `app/dashboard/stores/[id]/products/example-with-permissions.tsx` - Exemple d'utilisation

### Documentation
- `scripts/init-store-permissions.ts` - Script d'initialisation (optionnel)
- `STORE_PERMISSIONS_SYSTEM.md` - Cette documentation

## 🔧 Navigation

Le système ajoute une section "Administration" dans la sidebar des magasins avec :
- **Utilisateurs** - Gestion des utilisateurs et de leurs rôles
- **Test Permissions** - Page de test et d'initialisation du système

## ✅ Avantages

### Sécurité
- Permissions granulaires par module et action
- Isolation complète entre magasins
- Traçabilité des assignations de rôles

### Flexibilité
- Rôles personnalisables par magasin
- Permissions modulaires et extensibles
- Coexistence avec le système global

### Facilité d'utilisation
- Interface intuitive de gestion
- Composants de protection réutilisables
- Initialisation automatique

### Évolutivité
- Architecture modulaire
- APIs RESTful complètes
- Types TypeScript stricts

## 🔄 Coexistence avec le Système Global

Le système de permissions magasin coexiste parfaitement avec le système global existant :

- **Permissions globales** : Accès aux modules principaux (Dashboard, Warehouse, etc.)
- **Permissions magasin** : Accès aux fonctionnalités spécifiques du magasin

Un utilisateur peut avoir :
- Des rôles globaux (ex: "Admin", "Manager")
- Des rôles spécifiques par magasin (ex: "Vendeur" dans Magasin A, "Manager" dans Magasin B)

## 🎉 Système Prêt à l'Emploi

Le système est maintenant complètement implémenté et prêt à être utilisé. Pour commencer :

1. Accédez à un magasin : `/dashboard/stores/{id}`
2. Allez dans "Administration" > "Test Permissions"
3. Cliquez sur "Initialiser les permissions"
4. Testez les différentes permissions
5. Gérez les utilisateurs dans "Administration" > "Utilisateurs"

Le système offre une gestion décentralisée et sécurisée des accès au niveau de chaque magasin, permettant aux managers de magasin d'être autonomes dans la gestion de leurs équipes.
