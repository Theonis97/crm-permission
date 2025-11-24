# Solution : Donner accès à admin@example.com aux pages des magasins

## Problème
L'utilisateur `admin@example.com` ne peut pas accéder à la page `dashboard/stores/[id]/users` et reçoit l'erreur :
> "Vous n'avez pas accès à ce magasin. Contactez un administrateur pour obtenir les permissions nécessaires."

## Solutions disponibles

### Option 1 : Script SQL (Recommandé)
Exécutez le script SQL fourni dans votre base de données PostgreSQL :

```bash
psql -h 148.230.115.195 -U your_username -d your_database -f scripts/add-admin-store-access.sql
```

### Option 2 : Via l'interface web
1. **Connectez-vous** en tant qu'utilisateur ayant les droits d'administration des magasins
2. **Allez dans** Dashboard → Magasins
3. **Pour chaque magasin** :
   - Cliquez sur le magasin
   - Allez dans l'onglet "Utilisateurs" 
   - Cliquez sur "Inviter un utilisateur"
   - Ajoutez `admin@example.com` avec le rôle "Super Admin"

### Option 3 : Modification temporaire du code
Si vous voulez une solution rapide temporaire, vous pouvez modifier le composant `StorePermissionGuard` pour bypasser la vérification pour les Super Admins :

**Fichier** : `/components/auth/store-permission-guard.tsx`

Ajoutez cette condition au début de la fonction :
```typescript
// Bypass pour les Super Admins
if (session?.user?.email === 'admin@example.com') {
  return <>{children}</>
}
```

## Ce que fait la solution SQL

1. **Crée les permissions de magasin** si elles n'existent pas :
   - `store.users.view` (nécessaire pour la page users)
   - `store.users.invite`
   - `store.users.roles`
   - Et toutes les autres permissions de magasin

2. **Pour chaque magasin** :
   - Crée un rôle "Super Admin" 
   - Assigne toutes les permissions à ce rôle
   - Assigne ce rôle à `admin@example.com`

3. **Résultat** : `admin@example.com` aura accès à toutes les pages de tous les magasins

## Vérification
Après avoir appliqué la solution, vous devriez pouvoir :
- Accéder à `dashboard/stores/[id]/users`
- Voir la liste des utilisateurs du magasin
- Inviter de nouveaux utilisateurs
- Gérer les rôles

## Permissions accordées
- ✅ Voir le tableau de bord du magasin
- ✅ Gérer les produits (voir, créer, modifier, supprimer)
- ✅ Gérer les commandes
- ✅ Accéder au point de vente
- ✅ **Gérer les utilisateurs** (la permission manquante)
- ✅ Modifier les paramètres du magasin

## Notes importantes
- Cette solution donne un accès complet à tous les magasins
- Pour un accès plus granulaire, utilisez l'interface web (Option 2)
- Les permissions sont au niveau du magasin, pas globales
