# Documentation des Permissions - ERP Intech

## Vue d'ensemble

Le système de permissions de l'application ERP Intech est conçu pour gérer l'accès aux différents modules de l'application. Chaque permission est définie par un **module** et une **action**.

Format: `{module}.{action}`

## Modules de l'Application

### 1. Gestion des Utilisateurs (`users`)
- `users.view` - Voir les utilisateurs
- `users.create` - Créer des utilisateurs
- `users.edit` - Modifier les utilisateurs
- `users.delete` - Supprimer les utilisateurs

### 2. Gestion des Rôles (`roles`)
- `roles.view` - Voir les rôles
- `roles.create` - Créer des rôles
- `roles.edit` - Modifier les rôles
- `roles.delete` - Supprimer les rôles
- `roles.assign` - Assigner des rôles aux utilisateurs

### 3. Gestion des Contacts (`contacts`)
- `contacts.view` - Voir les contacts
- `contacts.create` - Créer des contacts
- `contacts.edit` - Modifier les contacts
- `contacts.delete` - Supprimer les contacts
- `contacts.export` - Exporter les contacts

### 4. Gestion des Produits (`products`)
- `products.view` - Voir les produits
- `products.create` - Créer des produits
- `products.edit` - Modifier les produits
- `products.delete` - Supprimer les produits

### 5. Gestion des Entrepôts (`warehouses`) 🏭
**Nouvellement ajouté**

- `warehouses.view` - Voir les entrepôts
- `warehouses.create` - Créer des entrepôts
- `warehouses.edit` - Modifier les entrepôts
- `warehouses.delete` - Supprimer les entrepôts
- `warehouses.manage_stock` - Gérer les stocks dans les entrepôts
- `warehouses.transfer` - Transférer des stocks entre entrepôts
- `warehouses.inventory` - Faire l'inventaire des entrepôts
- `warehouses.export` - Exporter les données d'entrepôt

### 6. Gestion des Magasins (`stores`) 🏪
**Nouvellement ajouté**

- `stores.view` - Voir les magasins
- `stores.create` - Créer des magasins
- `stores.edit` - Modifier les magasins
- `stores.delete` - Supprimer les magasins
- `stores.assign_manager` - Assigner un gestionnaire au magasin
- `stores.manage_inventory` - Gérer l'inventaire du magasin
- `stores.view_sales` - Voir les ventes du magasin
- `stores.export` - Exporter les données du magasin

### 7. Gestion des Devis (`quotes`)
- `quotes.view` - Voir les devis
- `quotes.create` - Créer des devis
- `quotes.edit` - Modifier les devis
- `quotes.delete` - Supprimer les devis
- `quotes.send` - Envoyer des devis

### 8. Gestion des Factures (`invoices`)
- `invoices.view` - Voir les factures
- `invoices.create` - Créer des factures
- `invoices.edit` - Modifier les factures
- `invoices.delete` - Supprimer les factures
- `invoices.send` - Envoyer des factures

### 9. Gestion des Tâches (`tasks`)
- `tasks.view` - Voir les tâches
- `tasks.create` - Créer des tâches
- `tasks.edit` - Modifier les tâches
- `tasks.delete` - Supprimer les tâches
- `tasks.assign` - Assigner des tâches

### 10. Gestion des Opportunités (`opportunities`)
- `opportunities.view` - Voir les opportunités
- `opportunities.create` - Créer des opportunités
- `opportunities.edit` - Modifier les opportunités
- `opportunities.delete` - Supprimer les opportunités

### 11. Rapports (`reports`)
- `reports.view` - Voir les rapports
- `reports.export` - Exporter les rapports

## Rôles et Permissions par Défaut

### Super Admin
- **Accès complet** à toutes les fonctionnalités
- Toutes les permissions de tous les modules
- Peut gérer les rôles et permissions

### Admin
- Toutes les permissions **sauf**:
  - `users.delete`
  - `roles.create`
  - `roles.edit`
  - `roles.delete`
  - Toutes les permissions `.delete` des autres modules

### Manager
- Accès aux modules: contacts, products, quotes, invoices, tasks, opportunities, reports, **warehouses**, **stores**
- Toutes les actions **sauf** delete
- Peut gérer les équipes et les opérations quotidiennes

### Commercial
- Accès aux modules: contacts, products, quotes, tasks, opportunities, stores
- Actions autorisées: view, create, edit
- Permission spéciale: `stores.view_sales` (voir les ventes des magasins)

### Utilisateur (Lecture seule)
- Permission `view` uniquement sur tous les modules
- Aucune capacité de création ou modification

## Scripts Disponibles

### Ajouter toutes les permissions manquantes
```bash
node scripts/add-all-missing-permissions.js
```
Ce script ajoute les permissions pour les entrepôts et magasins s'ils n'existent pas déjà.

### Ajouter uniquement les permissions d'entrepôt
```bash
node scripts/add-warehouse-permissions.js
```

### Ajouter uniquement les permissions de magasins
```bash
node scripts/add-store-permissions.js
```

### Vérifier les permissions existantes
```bash
node scripts/check-permissions.js
```
Ce script affiche:
- La liste de tous les utilisateurs et leurs rôles
- Les permissions par module (produits, entrepôts, magasins, ventes, tâches)
- Les rôles ayant accès à chaque module

### Réinitialiser toutes les permissions
```bash
npm run seed
# ou
npx prisma db seed
```
**⚠️ Attention**: Cela supprime toutes les données existantes et recrée les rôles, permissions et utilisateurs par défaut.

## Comptes de Test

Après avoir exécuté le seed, les comptes suivants sont disponibles:

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@example.com | password | Super Admin |
| manager@example.com | password | Manager |
| commercial@example.com | password | Commercial |
| user@example.com | password | Utilisateur |

## Comment Ajouter un Nouveau Module

1. **Définir les permissions** dans `prisma/seed.ts`:
```javascript
// Module example
{ name: "module.view", description: "Voir le module", module: "module", action: "view" },
{ name: "module.create", description: "Créer dans le module", module: "module", action: "create" },
// ... autres actions
```

2. **Créer un script d'ajout** (optionnel):
```javascript
// scripts/add-module-permissions.js
```

3. **Mettre à jour les attributions de rôles** dans `prisma/seed.ts`:
```javascript
const managerPermissions = permissions.filter(
  (p) =>
    ["contacts", "products", ..., "module"].includes(p.module) &&
    p.action !== "delete",
)
```

4. **Exécuter le seed**:
```bash
npm run seed
```

## Structure de la Base de Données

```
Permission
├── id (String)
├── name (String, unique) - Format: "module.action"
├── description (String)
├── module (String)
├── action (String)
└── rolePermissions (RolePermission[])

Role
├── id (String)
├── name (String, unique)
├── description (String)
├── isSystem (Boolean)
└── rolePermissions (RolePermission[])

RolePermission
├── roleId (String)
├── permissionId (String)
├── role (Role)
└── permission (Permission)
```

## Bonnes Pratiques

1. **Naming Convention**: Toujours utiliser le format `{module}.{action}`
2. **Actions Standard**: view, create, edit, delete
3. **Actions Spéciales**: Utiliser des noms descriptifs (ex: `manage_stock`, `assign_manager`)
4. **Module Names**: Toujours au pluriel en anglais (ex: `warehouses`, `stores`)
5. **Descriptions**: En français, claires et concises
6. **Attribution de Rôles**: 
   - Super Admin: Tout
   - Admin: Tout sauf suppression critique
   - Manager: Opérations quotidiennes sans suppression
   - Commercial: Création et consultation
   - Utilisateur: Lecture seule

## Questions Fréquentes

### Comment vérifier si un utilisateur a une permission?
```javascript
import { hasPermission } from "@/lib/auth-helpers"

const canViewWarehouses = await hasPermission(userId, "warehouses.view")
```

### Comment ajouter des permissions à un rôle existant?
```javascript
await prisma.rolePermission.create({
  data: {
    roleId: roleId,
    permissionId: permissionId,
  },
})
```

### Comment créer un rôle personnalisé?
1. Créer le rôle dans l'interface admin
2. Assigner les permissions nécessaires
3. Assigner le rôle aux utilisateurs

## Support

Pour toute question ou problème concernant les permissions, contacter l'équipe de développement.
