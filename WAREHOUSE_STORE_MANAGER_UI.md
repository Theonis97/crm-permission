# Interface de Gestion de Manager - Page Warehouse/Stores

## Vue d'ensemble
Cette fonctionnalité enrichit les cards des boutiques dans la page `dashboard/warehouse/stores` pour permettre la gestion complète des managers.

## Modifications Apportées

### 1. Nouveau Composant : `assign-manager-dialog.tsx`

**Emplacement :** `components/stores/assign-manager-dialog.tsx`

#### Fonctionnalités
- ✅ **Mode "Sélectionner"** : Assigner un utilisateur existant comme manager
- ✅ **Mode "Créer"** : Créer un nouvel utilisateur et l'assigner directement
- ✅ **Changer le manager** : Modifier le manager actuel d'une boutique
- ✅ **Retirer le manager** : Supprimer l'assignation du manager
- ✅ **Interface à onglets** : Basculer entre sélection et création

#### Props
```typescript
interface AssignManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  storeName: string
  currentManager?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
  } | null
  onSuccess: () => void
}
```

#### Création d'Utilisateur
**Champs requis :**
- ✅ Email (unique)
- ✅ Prénom
- ✅ Nom
- ⚪ Téléphone (optionnel)

**Mot de passe par défaut :** `Manager@2025`

### 2. Page Modifiée : `dashboard/warehouse/stores/page.tsx`

#### Modifications de l'Interface StoreData
Ajout des champs manager :
```typescript
interface StoreData {
  // ... champs existants
  managerId: string | null
  manager?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    name: string | null
  } | null
}
```

#### Nouveaux États
```typescript
const [managerDialogOpen, setManagerDialogOpen] = useState(false)
const [selectedStore, setSelectedStore] = useState<StoreDataExtended | null>(null)
```

#### Modifications des Cards

**Section Manager (nouvelle)** - Affichée en haut de la card :

1. **Si un manager est assigné :**
   - Avatar circulaire avec icône User
   - Nom complet du manager (prénom + nom)
   - Bouton icône pour changer le manager

2. **Si aucun manager :**
   - Bouton "Assigner un manager" pleine largeur
   - Style outline avec icône UserCog

**Optimisations visuelles :**
- Informations de contact réduites (texte en `text-xs`)
- Limitation de l'adresse à 1 ligne (`line-clamp-1`)
- Hauteur minimale ajustée pour la section informations (`min-h-[60px]`)

## Flux Utilisateur

### Scénario 1 : Assigner un Manager Existant
1. Cliquer sur "Assigner un manager" sur une card de boutique
2. Onglet "Sélectionner" ouvert par défaut
3. Choisir un utilisateur dans la liste déroulante
4. Cliquer sur "Assigner"
5. ✅ La card se met à jour automatiquement

### Scénario 2 : Créer et Assigner un Nouveau Manager
1. Cliquer sur "Assigner un manager"
2. Basculer sur l'onglet "Créer"
3. Remplir le formulaire :
   - Email
   - Prénom
   - Nom
   - Téléphone (optionnel)
4. Note : Le mot de passe `Manager@2025` sera assigné
5. Cliquer sur "Créer et Assigner"
6. ✅ L'utilisateur est créé et assigné automatiquement

### Scénario 3 : Changer le Manager
1. Sur une card avec un manager, cliquer sur l'icône UserCog
2. Sélectionner un autre utilisateur
3. Cliquer sur "Assigner"
4. ✅ Le manager est mis à jour

### Scénario 4 : Retirer le Manager
1. Sur une card avec un manager, cliquer sur l'icône UserCog
2. Onglet "Sélectionner"
3. Cliquer sur "Retirer le manager" (bouton rouge)
4. Confirmer l'action
5. ✅ Le manager est retiré, le bouton "Assigner" réapparaît

## Caractéristiques Techniques

### Gestion d'État
- Dialog séparé pour ne pas impacter les performances
- Rechargement automatique de la liste après modification (`onSuccess={fetchStores}`)
- Gestion des événements de clic avec `stopPropagation()` pour éviter l'ouverture du détail

### Validation
- Vérification de l'unicité de l'email lors de la création
- Tous les champs requis validés côté client et serveur
- Feedback immédiat avec toasts (sonner)

### Sécurité
- Mot de passe par défaut robuste : `Manager@2025`
- L'utilisateur pourra le changer lors de sa première connexion
- Pas de rôles assignés par défaut (à configurer manuellement)

### UX/UI
- **Design moderne** : Cards compactes avec toutes les informations essentielles
- **Actions contextuelles** : Boutons adaptés selon la présence ou non d'un manager
- **Feedback visuel** : États de chargement, toasts de confirmation
- **Navigation fluide** : Dialog modal qui ne bloque pas le reste de l'interface

## Icônes Utilisées

| Icône | Usage |
|-------|-------|
| `UserCog` | Assigner/Changer le manager |
| `User` | Avatar du manager dans la card |
| `Users` | Onglet "Sélectionner" |
| `UserPlus` | Onglet "Créer" et bouton de création |
| `CheckCircle2` | Bouton d'assignation |
| `Loader2` | États de chargement |

## Améliorations Futures

### Court terme
- [ ] Afficher le nombre de boutiques gérées par chaque manager dans la liste
- [ ] Filtre pour voir uniquement les boutiques sans manager
- [ ] Badge indiquant qu'un manager gère plusieurs boutiques

### Moyen terme
- [ ] Email de notification au manager lors de l'assignation
- [ ] Génération automatique de mot de passe sécurisé
- [ ] Envoi du mot de passe par email
- [ ] Option pour forcer le changement de mot de passe à la première connexion

### Long terme
- [ ] Dashboard spécifique pour les managers
- [ ] Permissions automatiques basées sur le rôle de manager
- [ ] Historique des assignations de manager
- [ ] Statistiques de performance par manager

## Tests Recommandés

### Tests Manuels
1. ✅ Assigner un manager existant
2. ✅ Créer et assigner un nouveau manager
3. ✅ Changer le manager d'une boutique
4. ✅ Retirer le manager d'une boutique
5. ✅ Vérifier l'affichage avec/sans manager
6. ✅ Tester la création avec email déjà existant (doit échouer)
7. ✅ Assigner le même manager à plusieurs boutiques
8. ✅ Vérifier le rechargement automatique après modification

### Tests de Régression
- Vérifier que les autres actions des cards fonctionnent toujours (voir, éditer, supprimer)
- Vérifier que le StoreDetailsSheet s'ouvre correctement
- Vérifier les permissions (stores.view, stores.update, etc.)

## Fichiers Modifiés

```
components/stores/
  └── assign-manager-dialog.tsx          (NOUVEAU - 450 lignes)

app/dashboard/warehouse/stores/
  └── page.tsx                           (MODIFIÉ)
      - Ajout interface manager
      - Ajout états pour dialog
      - Modification des cards
      - Ajout composant AssignManagerDialog
```

## API Utilisées

| Endpoint | Méthode | Usage |
|----------|---------|-------|
| `/api/users` | GET | Liste des utilisateurs |
| `/api/users` | POST | Création d'utilisateur |
| `/api/stores/:id` | PUT | Mise à jour du manager |

## Configuration Mot de Passe

**Mot de passe par défaut :** `Manager@2025`

Ce mot de passe respecte les bonnes pratiques :
- ✅ 12 caractères minimum
- ✅ Majuscule
- ✅ Minuscule
- ✅ Chiffre
- ✅ Caractère spécial (@)

**Recommandation :** Forcer le changement à la première connexion (à implémenter).

## Support

Pour toute question ou problème concernant cette fonctionnalité, consulter :
- La documentation principale : `STORE_MANAGER_FEATURE.md`
- Le code source : `components/stores/assign-manager-dialog.tsx`
- Les API : `app/api/stores/` et `app/api/users/`
