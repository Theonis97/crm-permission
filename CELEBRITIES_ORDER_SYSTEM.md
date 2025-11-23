# Système de Commande de Célébrités

## Vue d'ensemble

Ce système permet aux utilisateurs de commander des messages vidéo personnalisés auprès de célébrités. Il comprend une page de détail de célébrité avec un processus de commande en 4 étapes via un sheet en plein écran.

## Architecture

### Pages créées

1. **`/app/celebrities/page.tsx`** - Liste des célébrités disponibles
2. **`/app/celebrities/[slug]/page.tsx`** - Page de détail d'une célébrité avec bouton de commande

### Composants

1. **`/components/celebrities/order-sheet.tsx`** - Sheet de commande avec 4 étapes
2. **`/components/celebrities/index.ts`** - Exports des composants

### Types

1. **`/types/celebrities.ts`** - Types TypeScript pour les célébrités et commandes

## Fonctionnalités du Sheet de Commande

### Design
- **Full width et height** comme demandé
- **Header fixe** avec bouton retour et photo de profil de la célébrité
- **Indicateur d'étapes** avec points de progression
- **Boutons d'action fixes en bas**

### Étape 1 : Pour quelle occasion ?
- **Cards d'occasions** avec icônes et couleurs
- Options : Anniversaire, Félicitations, Message d'amour, Professionnel, Motivation, Autre
- **Champ personnalisé** si "Autre" est sélectionné

### Étape 2 : Pour qui ?
- **Choix entre "Pour moi-même" ou "Pour quelqu'un d'autre"**
- Si pour quelqu'un d'autre :
  - **Champ prénom** obligatoire
  - **Sélection du genre** (Il/Elle) obligatoire

### Étape 3 : Le message
- **Zone de texte** pour le message personnalisé (500 caractères max)
- **Conseils** pour rédiger un bon message
- **Compteur de caractères** en temps réel

### Étape 4 : Le paiement
- **Sélection du pays** (Gabon, Cameroun, Côte d'Ivoire, Sénégal)
- **Modes de paiement** adaptés par pays :
  - Gabon : Orange Money, Airtel Money, Carte bancaire
  - Cameroun : Orange Money, MTN Mobile Money, Carte bancaire
  - Côte d'Ivoire : Orange Money, MTN Mobile Money, Moov Money, Carte bancaire
  - Sénégal : Orange Money, Free Money, Carte bancaire
- **Récapitulatif de commande** avec prix total

## Navigation et UX

### Validation par étape
- **Étape 1** : Une occasion doit être sélectionnée
- **Étape 2** : Si "quelqu'un d'autre", prénom et genre requis
- **Étape 3** : Message non vide requis
- **Étape 4** : Pays et mode de paiement requis

### Boutons d'action
- **Bouton "Continuer"** pour les étapes 1-3
- **Bouton "Finaliser la commande"** pour l'étape 4
- **Boutons désactivés** si validation échoue

### Header dynamique
- **Bouton retour** : Ferme le sheet à l'étape 1, revient à l'étape précédente sinon
- **Photo de profil** de la célébrité toujours visible
- **Indicateur d'étapes** avec points de progression

## Utilisation

### Pour tester la fonctionnalité :

1. **Accéder à la liste des célébrités** :
   ```
   http://localhost:3000/celebrities
   ```

2. **Cliquer sur "Voir le profil"** d'une célébrité

3. **Cliquer sur "Passer votre commande"** dans la carte de droite

4. **Suivre les 4 étapes** du processus de commande

### Données mock incluses
- 4 célébrités d'exemple avec différentes catégories
- Prix en FCFA comme demandé
- Statuts en ligne/hors ligne
- Notes et avis

## Personnalisation

### Ajouter de nouvelles occasions
Modifier le tableau `occasions` dans `order-sheet.tsx` :

```typescript
const occasions = [
  { id: 'new-occasion', label: 'Nouvelle Occasion', icon: NewIcon, color: 'bg-purple-100 text-purple-600' },
  // ...
]
```

### Ajouter de nouveaux pays
Modifier les tableaux `countries` et `paymentMethods` :

```typescript
const countries = [
  { code: 'NEW', name: 'Nouveau Pays', currency: 'FCFA' },
  // ...
]

const paymentMethods = {
  NEW: ['Nouveau Mode 1', 'Nouveau Mode 2'],
  // ...
}
```

### Modifier les prix
Les prix sont affichés en FCFA et formatés automatiquement avec `toLocaleString('fr-FR')`.

## Intégration Backend

Le composant est prêt pour l'intégration avec une API backend. La fonction `handleSubmit` dans `order-sheet.tsx` peut être modifiée pour envoyer les données à votre API :

```typescript
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/celebrity-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        celebrityId: celebrity.id,
        orderData: orderData
      })
    })
    // Traiter la réponse
  } catch (error) {
    // Gérer l'erreur
  }
}
```

## Dépendances UI

Le système utilise les composants shadcn/ui suivants :
- `Sheet` et `SheetContent`
- `Button`
- `Card` et `CardContent`
- `Input`
- `Label`
- `Textarea`
- `RadioGroup` et `RadioGroupItem`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`
- `Badge`

Assurez-vous que ces composants sont installés dans votre projet.

## Prochaines étapes

1. **Intégration API** pour récupérer les vraies données de célébrités
2. **Système de paiement** réel avec les providers locaux
3. **Notifications** de confirmation de commande
4. **Historique des commandes** pour les utilisateurs
5. **Panel admin** pour gérer les célébrités et commandes
