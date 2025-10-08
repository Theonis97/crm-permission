# Scripts de Gestion des Permissions

Ce dossier contient tous les scripts pour gérer les permissions de l'application ERP Intech.

## 📁 Scripts Disponibles

### 🎯 Scripts Recommandés

#### `add-all-missing-permissions.js` ⭐
**À utiliser en priorité pour ajouter les nouvelles permissions**

```bash
node scripts/add-all-missing-permissions.js
```

Ajoute toutes les permissions manquantes pour:
- 🏭 Module Entrepôts (warehouses)
- 🏪 Module Magasins (stores)

Attribue automatiquement les permissions aux rôles appropriés.

---

#### `check-permissions.js` 🔍
**Vérifier l'état actuel des permissions**

```bash
node scripts/check-permissions.js
```

Affiche:
- Liste de tous les utilisateurs et leurs rôles
- Permissions par module (produits, entrepôts, magasins, ventes, tâches)
- Rôles ayant accès à chaque module

---

#### `show-permissions-matrix.js` 📊
**Visualiser la matrice complète des permissions**

```bash
node scripts/show-permissions-matrix.js
```

Affiche:
- Matrice visuelle des permissions par rôle
- Résumé détaillé par rôle
- Statistiques globales
- Permissions par module

---

### 📦 Scripts de Modules Individuels

#### `add-warehouse-permissions.js` 🏭
Ajoute uniquement les permissions du module Entrepôt

```bash
node scripts/add-warehouse-permissions.js
```

**Permissions ajoutées:**
- warehouses.view
- warehouses.create
- warehouses.edit
- warehouses.delete
- warehouses.manage_stock
- warehouses.transfer
- warehouses.inventory
- warehouses.export

---

#### `add-store-permissions.js` 🏪
Ajoute uniquement les permissions du module Magasins

```bash
node scripts/add-store-permissions.js
```

**Permissions ajoutées:**
- stores.view
- stores.create
- stores.edit
- stores.delete
- stores.assign_manager
- stores.manage_inventory
- stores.view_sales
- stores.export

---

#### `add-product-permissions.js` 📦
Ajoute les permissions du module Produits

```bash
node scripts/add-product-permissions.js
```

---

#### `add-sales-permissions.js` 💰
Ajoute les permissions des modules Devis et Factures

```bash
node scripts/add-sales-permissions.js
```

---

#### `add-task-permissions.js` ✅
Ajoute les permissions du module Tâches

```bash
node scripts/add-task-permissions.js
```

---

#### `add-opportunity-permissions.js` 🎯
Ajoute les permissions du module Opportunités

```bash
node scripts/add-opportunity-permissions.js
```

---

### 🔧 Autres Scripts Utiles

#### `verify-setup.js`
Vérifie la configuration de la base de données

```bash
node scripts/verify-setup.js
```

---

#### `verify-database.js`
Vérifie la connexion et l'état de la base de données

```bash
node scripts/verify-database.js
```

---

#### `debug-seed.js`
Debug les problèmes lors du seed

```bash
node scripts/debug-seed.js
```

---

#### `simple-seed.js`
Seed simplifié pour les tests

```bash
node scripts/simple-seed.js
```

---

## 🚀 Guide d'Utilisation Rapide

### Première Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données
npx prisma db push

# 3. Seed initial avec TOUTES les permissions
npm run seed
```

### Ajouter les Nouvelles Permissions (Mise à jour)

Si vous avez déjà une base de données et voulez ajouter les permissions des entrepôts et magasins:

```bash
# Option recommandée
node scripts/add-all-missing-permissions.js

# OU séparément
node scripts/add-warehouse-permissions.js
node scripts/add-store-permissions.js
```

### Vérifier que Tout Fonctionne

```bash
# Voir toutes les permissions
node scripts/check-permissions.js

# Voir la matrice complète
node scripts/show-permissions-matrix.js
```

---

## 📋 Ordre d'Exécution Recommandé

### Pour une Nouvelle Installation

1. `npm run seed` - Créer toutes les données initiales
2. `node scripts/check-permissions.js` - Vérifier

### Pour Ajouter les Nouveaux Modules

1. `node scripts/add-all-missing-permissions.js` - Ajouter entrepôts et magasins
2. `node scripts/show-permissions-matrix.js` - Vérifier la matrice

### Pour Débugger

1. `node scripts/verify-database.js` - Vérifier la connexion
2. `node scripts/check-permissions.js` - Voir l'état actuel
3. `node scripts/debug-seed.js` - Si problèmes de seed

---

## ⚠️ Avertissements Importants

### `npm run seed` ou `npx prisma db seed`
**⚠️ ATTENTION**: Ces commandes SUPPRIMENT toutes les données existantes!

- Supprime tous les utilisateurs
- Supprime tous les rôles
- Supprime toutes les permissions
- Recrée les données par défaut

**À utiliser uniquement:**
- Lors de la première installation
- Pour réinitialiser complètement la base de données en développement
- JAMAIS en production sans backup

### Scripts `add-*-permissions.js`
✅ **SAFE**: Ces scripts utilisent `upsert` et ne suppriment rien

- Ajoute les permissions manquantes
- Met à jour les descriptions si elles existent déjà
- Assigne les permissions aux rôles appropriés
- Peut être exécuté plusieurs fois sans problème

---

## 🎯 Cas d'Usage

### Cas 1: Je viens de cloner le projet

```bash
npm install
npx prisma db push
npm run seed
node scripts/check-permissions.js
```

### Cas 2: J'ai déjà des données et je veux ajouter les nouveaux modules

```bash
node scripts/add-all-missing-permissions.js
node scripts/show-permissions-matrix.js
```

### Cas 3: Je veux vérifier mes permissions

```bash
node scripts/check-permissions.js
# OU pour plus de détails
node scripts/show-permissions-matrix.js
```

### Cas 4: Un module spécifique ne fonctionne pas

```bash
# Réajouter les permissions du module
node scripts/add-warehouse-permissions.js
# OU
node scripts/add-store-permissions.js
```

### Cas 5: Tout réinitialiser (⚠️ Attention!)

```bash
npm run seed
```

---

## 📚 Documentation Complète

Pour plus d'informations, consulter:
- `/docs/PERMISSIONS.md` - Documentation complète des permissions
- `/docs/GUIDE-PERMISSIONS-FR.md` - Guide rapide en français
- `/prisma/schema.prisma` - Schéma de la base de données
- `/prisma/seed.ts` - Script de seed principal

---

## 💡 Tips

1. **Toujours vérifier avant d'exécuter un seed complet**: `npm run seed` supprime tout!
2. **Utiliser les scripts individuels**: Plus sûr pour ajouter des permissions
3. **Vérifier régulièrement**: `check-permissions.js` est votre ami
4. **Visualiser la matrice**: `show-permissions-matrix.js` pour une vue d'ensemble
5. **Backup avant modifications**: Toujours sauvegarder en production

---

## 🆘 Aide

Si vous rencontrez des problèmes:

1. Vérifier la connexion: `node scripts/verify-database.js`
2. Voir l'état actuel: `node scripts/check-permissions.js`
3. Consulter les logs d'erreur
4. Contacter l'équipe de développement

---

**Dernière mise à jour**: Ajout des modules Entrepôts et Magasins
