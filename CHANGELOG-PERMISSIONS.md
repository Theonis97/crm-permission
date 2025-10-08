# Changelog - Ajout des Permissions Entrepôts et Magasins

## 📅 Date: 2025-10-08

## ✨ Nouveautés

### 🏭 Module Entrepôt (Warehouses)

**8 nouvelles permissions ajoutées:**

| Permission | Description | Action |
|------------|-------------|--------|
| `warehouses.view` | Voir les entrepôts | view |
| `warehouses.create` | Créer des entrepôts | create |
| `warehouses.edit` | Modifier les entrepôts | edit |
| `warehouses.delete` | Supprimer les entrepôts | delete |
| `warehouses.manage_stock` | Gérer les stocks dans les entrepôts | manage_stock |
| `warehouses.transfer` | Transférer des stocks entre entrepôts | transfer |
| `warehouses.inventory` | Faire l'inventaire des entrepôts | inventory |
| `warehouses.export` | Exporter les données d'entrepôt | export |

**Attribution aux rôles:**
- ✅ **Super Admin**: Toutes les permissions
- ✅ **Admin**: Toutes sauf `warehouses.delete`
- ✅ **Manager**: view, manage_stock, inventory, export
- ❌ **Commercial**: Aucun accès
- ❌ **Utilisateur**: Aucun accès

---

### 🏪 Module Magasins (Stores)

**8 nouvelles permissions ajoutées:**

| Permission | Description | Action |
|------------|-------------|--------|
| `stores.view` | Voir les magasins | view |
| `stores.create` | Créer des magasins | create |
| `stores.edit` | Modifier les magasins | edit |
| `stores.delete` | Supprimer les magasins | delete |
| `stores.assign_manager` | Assigner un gestionnaire au magasin | assign_manager |
| `stores.manage_inventory` | Gérer l'inventaire du magasin | manage_inventory |
| `stores.view_sales` | Voir les ventes du magasin | view_sales |
| `stores.export` | Exporter les données du magasin | export |

**Attribution aux rôles:**
- ✅ **Super Admin**: Toutes les permissions
- ✅ **Admin**: Toutes sauf `stores.delete`
- ✅ **Manager**: Toutes sauf `stores.delete`
- ✅ **Commercial**: view, view_sales
- ❌ **Utilisateur**: Aucun accès

---

## 📁 Nouveaux Fichiers Créés

### Scripts d'Ajout de Permissions

1. **`scripts/add-warehouse-permissions.js`**
   - Ajoute les 8 permissions d'entrepôt
   - Configure les attributions de rôles

2. **`scripts/add-store-permissions.js`**
   - Ajoute les 8 permissions de magasins
   - Configure les attributions de rôles

3. **`scripts/add-all-missing-permissions.js`** ⭐
   - Script principal pour ajouter tous les nouveaux modules
   - Recommandé pour les mises à jour

### Scripts de Vérification

4. **`scripts/show-permissions-matrix.js`**
   - Affiche une matrice visuelle complète
   - Résumé par rôle et par module
   - Statistiques globales

### Documentation

5. **`docs/PERMISSIONS.md`**
   - Documentation complète du système de permissions
   - Guide d'utilisation des scripts
   - Bonnes pratiques

6. **`docs/GUIDE-PERMISSIONS-FR.md`**
   - Guide rapide en français
   - Cas d'usage typiques
   - Exemples de code

7. **`scripts/README.md`**
   - Documentation des scripts
   - Guide d'utilisation
   - Ordre d'exécution recommandé

8. **`CHANGELOG-PERMISSIONS.md`** (ce fichier)
   - Historique des modifications

---

## 🔄 Fichiers Modifiés

### `prisma/seed.ts`
**Ajout des permissions dans le seed principal:**
- Ajout de 8 permissions warehouses (lignes 130-153)
- Ajout de 8 permissions stores (lignes 155-173)
- Mise à jour de l'attribution au rôle Manager (ligne 223)
- Mise à jour de l'attribution au rôle Commercial (ligne 241-242)

### `scripts/check-permissions.js`
**Amélioration de la vérification:**
- Ajout de la vérification multi-modules
- Support des nouveaux modules warehouses et stores
- Affichage amélioré avec icônes

### `package.json`
**Nouveaux scripts npm:**
```bash
npm run permissions:add          # Ajouter toutes les nouvelles permissions
npm run permissions:check        # Vérifier les permissions
npm run permissions:matrix       # Afficher la matrice
npm run permissions:warehouse    # Ajouter permissions entrepôts
npm run permissions:store        # Ajouter permissions magasins
npm run permissions:product      # Ajouter permissions produits
npm run permissions:sales        # Ajouter permissions ventes
npm run permissions:task         # Ajouter permissions tâches
npm run permissions:opportunity  # Ajouter permissions opportunités
```

---

## 🚀 Comment Appliquer les Changements

### Option 1: Nouvelle Installation (Base de données vide)

```bash
# Installation complète avec toutes les permissions
npm run setup
```

### Option 2: Mise à Jour (Base de données existante) ⭐ RECOMMANDÉ

```bash
# Ajouter uniquement les nouvelles permissions
npm run permissions:add
```

### Option 3: Réinitialisation Complète ⚠️

```bash
# ATTENTION: Supprime toutes les données!
npm run db:reset
```

---

## 📊 Statistiques

### Avant la Mise à Jour
- **Modules**: 9 (users, roles, contacts, products, quotes, invoices, tasks, opportunities, reports)
- **Permissions totales**: ~50 permissions

### Après la Mise à Jour
- **Modules**: 11 (+ warehouses, stores)
- **Permissions totales**: ~66 permissions
- **Nouvelles permissions**: 16 (8 warehouses + 8 stores)

---

## 🧪 Tests Recommandés

Après l'application des changements:

1. **Vérifier les permissions**
   ```bash
   npm run permissions:check
   ```

2. **Voir la matrice complète**
   ```bash
   npm run permissions:matrix
   ```

3. **Tester l'authentification**
   - Se connecter avec différents rôles
   - Vérifier l'accès aux nouveaux modules
   - Tester les actions (view, create, edit, delete)

4. **Vérifier la base de données**
   ```bash
   npm run db:studio
   ```

---

## 🔐 Sécurité

### Vérifications Ajoutées
- Toutes les permissions utilisent le format standard `{module}.{action}`
- Attribution cohérente par rôle
- Respect de la hiérarchie des permissions

### Points d'Attention
- Les permissions `.delete` sont restreintes aux Super Admin et Admin
- Le Commercial a un accès limité aux magasins (lecture + ventes)
- Les Managers ne peuvent pas supprimer les entrepôts et magasins

---

## 📝 Notes de Migration

### Compatibilité Ascendante
✅ **100% compatible** avec les bases de données existantes
- Utilisation de `upsert` dans tous les scripts
- Pas de suppression de données
- Pas de modification des permissions existantes

### Rollback
Si nécessaire, les permissions peuvent être supprimées manuellement:
```sql
DELETE FROM RolePermission WHERE permissionId IN (
  SELECT id FROM Permission WHERE module IN ('warehouses', 'stores')
);
DELETE FROM Permission WHERE module IN ('warehouses', 'stores');
```

---

## 🎯 Prochaines Étapes Suggérées

### Frontend
- [ ] Créer les interfaces pour le module Entrepôt
- [ ] Créer les interfaces pour le module Magasins
- [ ] Ajouter les composants de gestion des stocks
- [ ] Implémenter les tableaux de bord

### Backend
- [ ] Créer les API routes pour warehouses
- [ ] Créer les API routes pour stores
- [ ] Implémenter la logique de transfert de stocks
- [ ] Ajouter les validations

### Tests
- [ ] Tests unitaires des permissions
- [ ] Tests d'intégration des nouveaux modules
- [ ] Tests de sécurité des accès

### Documentation
- [ ] Guide utilisateur pour les entrepôts
- [ ] Guide utilisateur pour les magasins
- [ ] Vidéos de démonstration

---

## 👥 Impact par Rôle

### Super Admin
- ✅ Accès complet aux entrepôts
- ✅ Accès complet aux magasins
- ✅ Peut tout gérer sans restriction

### Admin
- ✅ Peut créer, modifier entrepôts et magasins
- ❌ Ne peut pas supprimer
- ✅ Accès à toutes les autres fonctions

### Manager
- ✅ Peut gérer les stocks des entrepôts
- ✅ Peut gérer complètement les magasins (sauf suppression)
- ✅ Idéal pour la gestion opérationnelle

### Commercial
- ✅ Peut voir les magasins et leurs ventes
- ❌ Pas d'accès aux entrepôts
- ✅ Focus sur la relation client et ventes

### Utilisateur
- ❌ Pas d'accès aux nouveaux modules
- ℹ️ Peut être étendu selon les besoins

---

## 📞 Support

### Documentation
- `/docs/PERMISSIONS.md` - Documentation complète
- `/docs/GUIDE-PERMISSIONS-FR.md` - Guide rapide
- `/scripts/README.md` - Documentation des scripts

### Commandes Utiles
```bash
npm run permissions:check   # Vérifier l'état
npm run permissions:matrix  # Voir la matrice
npm run db:studio          # Explorer la base de données
```

### En Cas de Problème
1. Vérifier les logs de la console
2. Exécuter `npm run permissions:check`
3. Consulter la documentation
4. Contacter l'équipe de développement

---

## ✅ Checklist de Déploiement

- [x] Scripts de migration créés
- [x] Documentation mise à jour
- [x] Tests des scripts effectués
- [x] Permissions ajoutées au seed principal
- [x] Scripts npm configurés
- [x] README et guides créés
- [ ] Tests frontend à implémenter
- [ ] Tests backend à implémenter
- [ ] Revue de code
- [ ] Déploiement en staging
- [ ] Tests utilisateurs
- [ ] Déploiement en production

---

**Auteur**: Système de gestion des permissions ERP Intech  
**Version**: 2.0  
**Date**: 2025-10-08
