# Fonctionnalité de Manager de Boutique

## Vue d'ensemble
Cette fonctionnalité permet d'assigner un utilisateur comme manager d'une boutique. Un utilisateur peut gérer plusieurs boutiques, et l'assignation du manager est optionnelle.

## Modifications du Schéma de Base de Données

### Modèle `Store`
- ✅ Ajout du champ `managerId` (optionnel, nullable)
- ✅ Relation `manager` vers le modèle `User` avec `onDelete: SetNull`

### Modèle `User`
- ✅ Ajout de la relation inverse `managedStores` (one-to-many)

### Migration
- ✅ Migration appliquée : `20251013173245_add_store_manager`
- Colonne `manager_id` ajoutée à la table `stores`
- Clé étrangère créée avec `ON DELETE SET NULL`

## Modifications API

### `/api/stores` (GET)
- ✅ Retourne maintenant les informations du manager avec chaque boutique
- Inclut : `id`, `email`, `firstName`, `lastName`, `name`

### `/api/stores` (POST)
- ✅ Accepte le paramètre `managerId` lors de la création
- ✅ Retourne les informations du manager créé

### `/api/stores/[id]` (GET)
- ✅ Retourne les informations du manager de la boutique

### `/api/stores/[id]` (PUT)
- ✅ Accepte le paramètre `managerId` pour mise à jour
- ✅ Retourne les informations du manager mis à jour

## Composants UI

### `components/stores/manager-selector.tsx` (NOUVEAU)
Composant réutilisable pour la sélection du manager d'une boutique.

**Fonctionnalités :**
- 📋 Liste déroulante de tous les utilisateurs de la plateforme
- ➕ Bouton pour créer un nouvel utilisateur à la volée
- ✅ Option "Aucun manager" pour laisser le champ vide
- 🔄 Rechargement automatique de la liste après création
- 🎨 Interface moderne avec icônes et descriptions

**Props :**
- `value`: ID du manager sélectionné (optionnel)
- `onChange`: Callback appelé lors de la sélection
- `disabled`: Désactive le composant

### Modifications des Formulaires

#### `app/dashboard/stores/[id]/edit/page.tsx`
- ✅ Import du composant `ManagerSelector`
- ✅ Ajout du champ `managerId` au schéma de validation Zod
- ✅ Intégration du composant dans le formulaire
- ✅ Chargement et sauvegarde du manager

#### `components/stores/create-store-sheet.tsx`
- ✅ Import du composant `ManagerSelector`
- ✅ Ajout du champ `managerId` au state du formulaire
- ✅ Intégration du composant dans le formulaire
- ✅ Utilisation de la vraie API au lieu de données mockées
- ✅ Envoi du `managerId` lors de la création

## Utilisation

### Assigner un Manager lors de la Création
```tsx
// Le composant ManagerSelector est déjà intégré
// L'utilisateur peut :
// 1. Sélectionner un utilisateur existant
// 2. Créer un nouvel utilisateur
// 3. Laisser vide (aucun manager)
```

### Modifier le Manager d'une Boutique Existante
1. Aller dans "Magasins"
2. Cliquer sur une boutique
3. Cliquer sur "Modifier"
4. Section "Informations Générales" → "Manager de la boutique"
5. Sélectionner ou créer un utilisateur

### Créer un Nouvel Utilisateur comme Manager
1. Dans le sélecteur de manager, cliquer sur l'icône "+"
2. Remplir le formulaire :
   - Email (requis)
   - Prénom (requis)
   - Nom (requis)
   - Mot de passe (minimum 6 caractères)
3. L'utilisateur est créé et automatiquement sélectionné

## Règles Métier

### Contraintes
- ✅ Un manager est **optionnel** (peut être assigné plus tard)
- ✅ Un utilisateur peut être manager de **plusieurs boutiques**
- ✅ Si un manager est supprimé, le champ `managerId` devient `null` (pas de cascade)
- ✅ Pas de rôles spécifiques assignés lors de la création rapide d'utilisateur

### Validation
- Email unique pour les nouveaux utilisateurs
- Mot de passe minimum 6 caractères
- Tous les champs requis dans le formulaire de création d'utilisateur

## Tests Recommandés

### Tests Manuels à Effectuer
1. ✅ Créer une boutique sans manager
2. ✅ Créer une boutique avec un manager existant
3. ✅ Créer une boutique avec un nouveau manager (création rapide)
4. ✅ Modifier le manager d'une boutique existante
5. ✅ Retirer le manager d'une boutique (sélectionner "Aucun manager")
6. ✅ Assigner le même manager à plusieurs boutiques
7. ✅ Vérifier que la suppression d'un utilisateur met `managerId` à `null`

## Améliorations Futures

### Suggestions
- 📊 Afficher les boutiques gérées dans le profil utilisateur
- 🔐 Permissions spécifiques pour les managers de boutique
- 📧 Notification par email lors de l'assignation
- 📱 Dashboard spécifique pour les managers
- 📈 Statistiques par manager
- 🔍 Filtrer les boutiques par manager

## Fichiers Modifiés

### Backend
- `prisma/schema.prisma`
- `prisma/migrations/20251013173245_add_store_manager/migration.sql`
- `app/api/stores/route.ts`
- `app/api/stores/[id]/route.ts`

### Frontend
- `components/stores/manager-selector.tsx` (nouveau)
- `components/stores/create-store-sheet.tsx`
- `app/dashboard/stores/[id]/edit/page.tsx`

## Support

Pour toute question ou problème, veuillez consulter la documentation de Prisma sur les relations ou contacter l'équipe de développement.
