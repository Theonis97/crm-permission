# 🚀 Guide Rapide - Ajout des Permissions Entrepôts & Magasins

## ⚡ TL;DR - Commande Rapide

```bash
npm run permissions:add
```

**C'est tout!** Cette commande ajoute automatiquement toutes les permissions manquantes.

---

## 📋 Ce qui a été ajouté

### 🏭 Entrepôts (8 permissions)
```
✓ warehouses.view           - Voir les entrepôts
✓ warehouses.create         - Créer des entrepôts  
✓ warehouses.edit           - Modifier les entrepôts
✓ warehouses.delete         - Supprimer les entrepôts
✓ warehouses.manage_stock   - Gérer les stocks
✓ warehouses.transfer       - Transférer des stocks
✓ warehouses.inventory      - Faire l'inventaire
✓ warehouses.export         - Exporter les données
```

### 🏪 Magasins (8 permissions)
```
✓ stores.view               - Voir les magasins
✓ stores.create             - Créer des magasins
✓ stores.edit               - Modifier les magasins
✓ stores.delete             - Supprimer les magasins
✓ stores.assign_manager     - Assigner un gestionnaire
✓ stores.manage_inventory   - Gérer l'inventaire
✓ stores.view_sales         - Voir les ventes
✓ stores.export             - Exporter les données
```

---

## 🎯 Qui Peut Faire Quoi?

### 🏭 Entrepôts

| Rôle | Accès |
|------|-------|
| Super Admin | ✅ Tout |
| Admin | ✅ Tout sauf suppression |
| Manager | ✅ Vue, gestion stocks, inventaire |
| Commercial | ❌ Aucun accès |
| Utilisateur | ❌ Aucun accès |

### 🏪 Magasins

| Rôle | Accès |
|------|-------|
| Super Admin | ✅ Tout |
| Admin | ✅ Tout sauf suppression |
| Manager | ✅ Tout sauf suppression |
| Commercial | ✅ Vue + Voir les ventes |
| Utilisateur | ❌ Aucun accès |

---

## 🔥 Commandes Essentielles

```bash
# Ajouter les nouvelles permissions
npm run permissions:add

# Vérifier que tout est OK
npm run permissions:check

# Voir la matrice complète
npm run permissions:matrix

# Explorer la base de données
npm run db:studio
```

---

## 📂 Structure Complète des Modules

```
ERP Intech
├── 👥 Utilisateurs (users)
├── 🎭 Rôles (roles)
├── 📇 Contacts (contacts)
├── 📦 Produits (products)
├── 🏭 Entrepôts (warehouses) ⭐ NOUVEAU
├── 🏪 Magasins (stores) ⭐ NOUVEAU
├── 📄 Devis (quotes)
├── 🧾 Factures (invoices)
├── ✅ Tâches (tasks)
├── 🎯 Opportunités (opportunities)
└── 📊 Rapports (reports)
```

---

## 🆘 Dépannage Rapide

### Problème: Les permissions n'apparaissent pas

```bash
npm run permissions:add
npm run permissions:check
```

### Problème: Erreur lors de l'exécution

```bash
# Vérifier la connexion DB
npm run db:verify

# Regénérer Prisma
npm run db:generate
```

### Problème: Je veux tout réinitialiser (⚠️ Supprime tout!)

```bash
npm run db:reset
```

---

## 📚 Documentation Complète

- **Guide complet**: `docs/PERMISSIONS.md`
- **Guide rapide**: `docs/GUIDE-PERMISSIONS-FR.md`
- **Scripts**: `scripts/README.md`
- **Changelog**: `CHANGELOG-PERMISSIONS.md`

---

## ✨ Nouveaux Scripts npm

```bash
npm run permissions:add          # 🎯 Ajouter toutes les nouvelles permissions
npm run permissions:check        # 🔍 Vérifier les permissions
npm run permissions:matrix       # 📊 Voir la matrice complète
npm run permissions:warehouse    # 🏭 Ajouter entrepôts uniquement
npm run permissions:store        # 🏪 Ajouter magasins uniquement
```

---

## 💡 Pour Aller Plus Loin

### Créer un utilisateur avec accès entrepôt

```javascript
// 1. Créer l'utilisateur
const user = await prisma.user.create({
  data: {
    email: "manager@intech.com",
    name: "Manager Entrepôt",
    password: hashedPassword
  }
})

// 2. Assigner le rôle Manager
await prisma.userRole.create({
  data: {
    userId: user.id,
    roleId: managerRoleId
  }
})

// Résultat: Accès automatique aux entrepôts
```

### Vérifier une permission

```typescript
import { hasPermission } from "@/lib/auth-helpers"

const canViewWarehouses = await hasPermission(userId, "warehouses.view")
const canManageStock = await hasPermission(userId, "warehouses.manage_stock")
```

### Protéger une route API

```typescript
// app/api/warehouses/route.ts
export async function GET(request: Request) {
  const userId = await getCurrentUserId(request)
  
  if (!await hasPermission(userId, "warehouses.view")) {
    return new Response("Accès refusé", { status: 403 })
  }
  
  // Suite du code...
}
```

---

## 🎉 C'est Fait!

Vous avez maintenant:
- ✅ 16 nouvelles permissions (8 entrepôts + 8 magasins)
- ✅ Attribution automatique aux rôles appropriés
- ✅ Scripts npm pour gérer facilement
- ✅ Documentation complète en français

**Prochaine étape**: Créer les interfaces frontend pour les nouveaux modules!

---

**Questions?** Consulter `/docs/GUIDE-PERMISSIONS-FR.md`
