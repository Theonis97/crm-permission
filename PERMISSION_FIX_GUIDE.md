# Guide de Correction - Permission orders.create Manquante

## 🐛 Problème

```
❌ Permission "orders.create" NOT found
```

## 🔍 Diagnostic

Les permissions pour le module `orders` (commandes clients) n'existent pas dans la base de données.

## ✅ Solutions

### Option 1 : Script SQL (RAPIDE - Recommandé)

Exécutez ce script SQL directement dans votre base de données :

```sql
-- Créer les permissions
INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'orders.view', 'Voir les commandes clients', 'orders', 'view', NOW(), NOW()),
  (gen_random_uuid(), 'orders.create', 'Créer des commandes clients', 'orders', 'create', NOW(), NOW()),
  (gen_random_uuid(), 'orders.edit', 'Modifier les commandes clients', 'orders', 'edit', NOW(), NOW()),
  (gen_random_uuid(), 'orders.delete', 'Supprimer les commandes clients', 'orders', 'delete', NOW(), NOW()),
  (gen_random_uuid(), 'orders.validate', 'Valider les commandes clients', 'orders', 'validate', NOW(), NOW()),
  (gen_random_uuid(), 'orders.cancel', 'Annuler les commandes clients', 'orders', 'cancel', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Attribuer au rôle Super Admin
INSERT INTO role_permissions (id, role_id, permission_id, created_at)
SELECT 
  gen_random_uuid(),
  r.id,
  p.id,
  NOW()
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
  AND p.module = 'orders'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

**Commande** :
```bash
# Si vous utilisez psql
psql -U votre_user -d votre_database -f scripts/quick-fix-permissions.sql

# Ou copiez-collez le SQL dans votre client SQL
```

### Option 2 : Via Prisma Studio (VISUEL)

1. Ouvrir Prisma Studio :
```bash
npx prisma studio
```

2. Aller dans la table `permissions`

3. Créer manuellement ces 6 permissions :

| name | description | module | action |
|------|-------------|--------|--------|
| orders.view | Voir les commandes clients | orders | view |
| orders.create | Créer des commandes clients | orders | create |
| orders.edit | Modifier les commandes clients | orders | edit |
| orders.delete | Supprimer les commandes clients | orders | delete |
| orders.validate | Valider les commandes clients | orders | validate |
| orders.cancel | Annuler les commandes clients | orders | cancel |

4. Aller dans la table `role_permissions`

5. Créer les relations entre les permissions et votre rôle

### Option 3 : Seed Complet (LONG - Si base vide)

Si votre base de données est complètement vide :

```bash
npx prisma migrate reset --skip-seed
npx prisma migrate deploy
npx prisma db seed
```

⚠️ **ATTENTION** : Cela va effacer toutes les données !

## 🔍 Vérification

Après avoir appliqué une solution, vérifiez :

```sql
-- Vérifier les permissions
SELECT * FROM permissions WHERE module = 'orders';

-- Vérifier les attributions
SELECT 
  r.name AS role,
  p.name AS permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.module = 'orders'
ORDER BY r.name, p.name;
```

Ou via Prisma :

```typescript
// Dans un fichier test ou console
import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

// Vérifier les permissions
const ordersPerms = await prisma.permission.findMany({
  where: { module: 'orders' }
})
console.log(ordersPerms)

// Vérifier pour Super Admin
const superAdmin = await prisma.role.findUnique({
  where: { name: 'Super Admin' },
  include: {
    permissions: {
      include: {
        permission: true
      }
    }
  }
})
console.log(superAdmin?.permissions.filter(p => p.permission.module === 'orders'))
```

## 📝 Fichiers Modifiés

| Fichier | Description |
|---------|-------------|
| `prisma/seed.ts` | Permissions orders ajoutées |
| `scripts/add-orders-permissions.ts` | Script d'ajout automatique |
| `scripts/fix-orders-permissions.ts` | Script de correction |
| `scripts/quick-fix-permissions.sql` | Script SQL rapide ✅ |

## 🎯 Permissions par Rôle

### Super Admin
✅ orders.view  
✅ orders.create  
✅ orders.edit  
✅ orders.delete  
✅ orders.validate  
✅ orders.cancel  

### Admin
✅ orders.view  
✅ orders.create  
✅ orders.edit  
❌ orders.delete  
✅ orders.validate  
✅ orders.cancel  

### Manager
✅ orders.view  
✅ orders.create  
✅ orders.edit  
❌ orders.delete  
✅ orders.validate  
✅ orders.cancel  

### Commercial
✅ orders.view  
✅ orders.create  
✅ orders.edit  
❌ orders.delete  
❌ orders.validate  
❌ orders.cancel  

### Utilisateur
✅ orders.view  
❌ orders.create  
❌ orders.edit  
❌ orders.delete  
❌ orders.validate  
❌ orders.cancel  

## 🚀 Après la Correction

1. **Redémarrer le serveur Next.js**
```bash
# Arrêter avec Ctrl+C puis relancer
npm run dev
```

2. **Tester dans le POS**
   - Ouvrir le POS
   - Ajouter des produits au panier
   - Cliquer sur "Valider la commande"
   - Vérifier qu'il n'y a plus d'erreur de permission

3. **Vérifier dans les logs**
   - Plus de message ❌ Permission "orders.create" NOT found
   - Message ✅ Permission "orders.create" found

## 🛠️ Déboguer Si Ça Ne Fonctionne Pas

### 1. Vérifier que l'utilisateur a le bon rôle

```sql
SELECT 
  u.email,
  r.name AS role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'votre_email@example.com';
```

### 2. Vérifier que le rôle a les permissions

```sql
SELECT 
  r.name AS role,
  p.name AS permission
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'Votre Rôle'
  AND p.module = 'orders';
```

### 3. Vider le cache

```bash
# Supprimer .next
rm -rf .next

# Redémarrer
npm run dev
```

## 📋 Checklist

- [ ] Permissions créées dans la table `permissions`
- [ ] Permissions attribuées au rôle Super Admin
- [ ] Permissions attribuées aux autres rôles (Admin, Manager, Commercial)
- [ ] Serveur Next.js redémarré
- [ ] Test dans le POS effectué
- [ ] Plus d'erreur de permission

---

**Date** : 15 Octobre 2025  
**Status** : 🔧 En cours de correction
