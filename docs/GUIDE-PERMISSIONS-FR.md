# Guide Rapide - Système de Permissions ERP Intech

## 🚀 Démarrage Rapide

### Ajouter les Nouvelles Permissions (Entrepôts & Magasins)

```bash
# Option 1: Ajouter toutes les permissions manquantes
node scripts/add-all-missing-permissions.js

# Option 2: Ajouter module par module
node scripts/add-warehouse-permissions.js
node scripts/add-store-permissions.js
```

### Vérifier les Permissions

```bash
# Voir toutes les permissions et leur attribution
node scripts/check-permissions.js

# Voir la matrice complète des permissions
node scripts/show-permissions-matrix.js
```

## 📋 Nouveaux Modules Ajoutés

### 🏭 Module Entrepôt (Warehouses)

**Permissions disponibles:**
- ✅ `warehouses.view` - Consulter les entrepôts
- ➕ `warehouses.create` - Créer un entrepôt
- ✏️ `warehouses.edit` - Modifier un entrepôt
- 🗑️ `warehouses.delete` - Supprimer un entrepôt
- 📦 `warehouses.manage_stock` - Gérer les stocks
- 🔄 `warehouses.transfer` - Transférer entre entrepôts
- 📊 `warehouses.inventory` - Faire l'inventaire
- 💾 `warehouses.export` - Exporter les données

**Qui peut faire quoi ?**
- **Super Admin**: Tout ✓
- **Admin**: Tout sauf suppression
- **Manager**: Vue, gestion stock, inventaire, export
- **Commercial**: Pas d'accès
- **Utilisateur**: Pas d'accès

### 🏪 Module Magasins (Stores)

**Permissions disponibles:**
- ✅ `stores.view` - Consulter les magasins
- ➕ `stores.create` - Créer un magasin
- ✏️ `stores.edit` - Modifier un magasin
- 🗑️ `stores.delete` - Supprimer un magasin
- 👤 `stores.assign_manager` - Assigner un gestionnaire
- 📦 `stores.manage_inventory` - Gérer l'inventaire
- 💰 `stores.view_sales` - Voir les ventes
- 💾 `stores.export` - Exporter les données

**Qui peut faire quoi ?**
- **Super Admin**: Tout ✓
- **Admin**: Tout sauf suppression
- **Manager**: Tout sauf suppression
- **Commercial**: Vue + Voir les ventes
- **Utilisateur**: Pas d'accès

## 🎭 Matrice Simplifiée des Rôles

| Rôle | Description | Accès Entrepôts | Accès Magasins |
|------|-------------|-----------------|----------------|
| **Super Admin** | Contrôle total | ✓ Complet | ✓ Complet |
| **Admin** | Admin avec restrictions | ✓ Sauf delete | ✓ Sauf delete |
| **Manager** | Gestion opérationnelle | ✓ Partiel | ✓ Complet sauf delete |
| **Commercial** | Vente et consultation | ✗ | ✓ Vue + Ventes |
| **Utilisateur** | Lecture seule | ✗ | ✗ |

## 🔧 Commandes Utiles

### Installation et Configuration

```bash
# Installer les dépendances
npm install

# Générer le client Prisma
npx prisma generate

# Créer/Mettre à jour la base de données
npx prisma db push
```

### Gestion des Permissions

```bash
# Réinitialiser tout (⚠️ Supprime les données)
npm run seed

# Ajouter uniquement les nouvelles permissions
node scripts/add-all-missing-permissions.js

# Vérifier l'état actuel
node scripts/check-permissions.js

# Afficher la matrice des permissions
node scripts/show-permissions-matrix.js
```

### Gestion des Modules Individuels

```bash
# Ajouter permissions produits
node scripts/add-product-permissions.js

# Ajouter permissions ventes
node scripts/add-sales-permissions.js

# Ajouter permissions tâches
node scripts/add-task-permissions.js

# Ajouter permissions opportunités
node scripts/add-opportunity-permissions.js

# Ajouter permissions entrepôts
node scripts/add-warehouse-permissions.js

# Ajouter permissions magasins
node scripts/add-store-permissions.js
```

## 📊 Structure de l'Application

```
ERP Intech
├── 1. Gestion des Utilisateurs (users)
├── 2. Gestion des Rôles (roles)
├── 3. CRM (contacts, opportunities)
├── 4. Produits (products)
├── 5. Entrepôts ⭐ (warehouses) - NOUVEAU
├── 6. Magasins ⭐ (stores) - NOUVEAU
├── 7. Ventes (quotes, invoices)
├── 8. Tâches (tasks)
└── 9. Rapports (reports)
```

## 💡 Cas d'Usage Typiques

### Scénario 1: Nouveau Gestionnaire d'Entrepôt

```javascript
// 1. Créer l'utilisateur
const user = await createUser({
  email: "gestionnaire@intech.com",
  firstName: "Jean",
  lastName: "Dupont",
  password: "motdepasse"
})

// 2. Assigner le rôle Manager
await assignRole(user.id, "Manager")

// Résultat: Accès à warehouses.view, .manage_stock, .inventory, .export
```

### Scénario 2: Commercial avec Accès aux Magasins

```javascript
// Le rôle Commercial a déjà:
// - stores.view (voir les magasins)
// - stores.view_sales (voir les ventes)

// Vérifier l'accès
const canViewStores = await hasPermission(userId, "stores.view")
const canViewSales = await hasPermission(userId, "stores.view_sales")
```

### Scénario 3: Ajouter une Permission Personnalisée

```javascript
// 1. Créer la permission
const permission = await prisma.permission.create({
  data: {
    name: "warehouses.approve",
    description: "Approuver les opérations d'entrepôt",
    module: "warehouses",
    action: "approve"
  }
})

// 2. L'assigner à un rôle
await prisma.rolePermission.create({
  data: {
    roleId: managerRoleId,
    permissionId: permission.id
  }
})
```

## 🔐 Sécurité et Bonnes Pratiques

### ✅ À FAIRE

- Toujours vérifier les permissions côté serveur
- Utiliser `hasPermission()` avant toute action sensible
- Logger les actions importantes (création, modification, suppression)
- Tester les permissions après chaque modification

### ❌ À ÉVITER

- Ne JAMAIS se fier uniquement aux permissions côté client
- Ne pas hardcoder les vérifications de rôles (utiliser les permissions)
- Ne pas donner trop de permissions par défaut
- Ne pas oublier de mettre à jour les permissions lors de l'ajout de modules

## 📱 Exemples de Code

### Vérifier une Permission (Backend)

```typescript
import { hasPermission } from "@/lib/auth-helpers"

export async function GET(request: Request) {
  const userId = await getCurrentUserId(request)
  
  // Vérifier la permission
  if (!await hasPermission(userId, "warehouses.view")) {
    return new Response("Accès refusé", { status: 403 })
  }
  
  // Continuer l'opération...
  const warehouses = await prisma.warehouse.findMany()
  return Response.json(warehouses)
}
```

### Protéger un Composant (Frontend)

```tsx
import { PermissionGuard } from "@/components/auth/permission-guard"

export function WarehouseList() {
  return (
    <PermissionGuard permission="warehouses.view">
      <div>
        {/* Contenu visible uniquement avec la permission */}
        <WarehouseTable />
      </div>
    </PermissionGuard>
  )
}
```

### Vérifier Plusieurs Permissions

```typescript
// Vérifier si l'utilisateur peut gérer les stocks
const canManageStock = await hasPermission(userId, "warehouses.manage_stock")

// Vérifier plusieurs permissions
const permissions = await getUserPermissions(userId)
const canTransfer = permissions.includes("warehouses.transfer")
const canInventory = permissions.includes("warehouses.inventory")
```

## 🆘 Dépannage

### Problème: Les permissions n'apparaissent pas

```bash
# 1. Vérifier que les permissions existent
node scripts/check-permissions.js

# 2. Regénérer le client Prisma
npx prisma generate

# 3. Re-exécuter le script d'ajout
node scripts/add-all-missing-permissions.js
```

### Problème: Un rôle n'a pas les bonnes permissions

```bash
# 1. Voir les permissions actuelles du rôle
node scripts/show-permissions-matrix.js

# 2. Réexécuter le seed (⚠️ supprime tout)
npm run seed

# OU ajouter manuellement via l'API ou la console
```

### Problème: Erreur "Permission non trouvée"

```typescript
// Vérifier que la permission existe dans la base
const permission = await prisma.permission.findUnique({
  where: { name: "warehouses.view" }
})

if (!permission) {
  console.log("Permission manquante, exécuter add-warehouse-permissions.js")
}
```

## 📞 Support

Pour toute question concernant les permissions:
1. Consulter la documentation complète: `docs/PERMISSIONS.md`
2. Exécuter: `node scripts/show-permissions-matrix.js`
3. Contacter l'équipe de développement

---

**Dernière mise à jour**: Ajout des modules Entrepôts et Magasins
**Version**: 2.0
