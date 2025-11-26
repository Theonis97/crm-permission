# 📦 Guide d'utilisation - Demandes d'approvisionnement livreurs

## 🎯 Vue d'ensemble

Le système permet aux livreurs de demander du stock depuis la PWA et aux gestionnaires de magasin d'approuver/rejeter ces demandes depuis le CRM avec transfert automatique de stock.

## 🔄 Flux complet d'utilisation

### 1. **Côté Livreur (PWA)**

#### Étape 1 : Accéder aux demandes
1. Ouvrir la PWA livreur
2. Aller dans **Dashboard** → **Mouvements**
3. Cliquer sur **"Créer"** → **"Demande d'approvisionnement"**

#### Étape 2 : Créer une demande
1. **Rechercher** les produits disponibles dans le magasin
2. **Sélectionner** les produits désirés en cliquant sur le bouton **"+"**
3. **Ajuster** les quantités dans le panier
4. **Ajouter** des notes optionnelles
5. **Envoyer** la demande

#### Informations affichées :
- **Stock magasin** : Quantité disponible dans le magasin
- **Mon stock** : Stock actuel du livreur
- **Variantes** : Si le produit a des variantes (taille, couleur, etc.)

### 2. **Côté Magasin (CRM)**

#### Étape 1 : Accéder aux demandes
1. Se connecter au CRM
2. Aller dans **Dashboard** → **Magasins** → **[Nom du magasin]** → **Produits**
3. Cliquer sur **"Demandes livreurs"** dans la barre d'actions

#### Étape 2 : Gérer les demandes
1. **Visualiser** toutes les demandes avec leurs statuts
2. **Filtrer** par statut ou rechercher par livreur
3. **Voir les détails** de chaque demande

#### Actions disponibles :
- **👁️ Voir les détails** : Afficher tous les produits demandés
- **✅ Approuver** : Valider et transférer le stock
- **❌ Rejeter** : Refuser avec raison obligatoire

## 📊 Interface CRM - Demandes livreurs

### Dashboard principal
```
┌─────────────────────────────────────────────────────────┐
│ 📦 Demandes d'approvisionnement livreurs               │
│ Magasin Central • 12 demande(s) au total               │
├─────────────────────────────────────────────────────────┤
│ Stats rapides:                                          │
│ Total: 12  |  En attente: 3  |  Approuvées: 2         │
│ Terminées: 6  |  Rejetées: 1                           │
├─────────────────────────────────────────────────────────┤
│ 🔍 Rechercher par livreur...    [Filtrer par statut ▼] │
├─────────────────────────────────────────────────────────┤
│ 👤 Jean Dupont  📞 +241 01 23 45 67  🟡 En attente    │
│ 📅 26/11/2025 14:30  📦 3 produit(s)                   │
│ "Besoin urgent pour les livraisons de demain"          │
│                              [✅ Approuver] [❌ Rejeter] │
└─────────────────────────────────────────────────────────┘
```

### Processus d'approbation
1. **Cliquer** sur "Approuver"
2. **Ajuster** les quantités si nécessaire
3. **Confirmer** l'approbation
4. **Transfert automatique** : Stock magasin → Stock livreur

### Processus de rejet
1. **Cliquer** sur "Rejeter"
2. **Saisir** la raison du rejet (obligatoire)
3. **Confirmer** le rejet
4. Le livreur sera informé de la raison

## 🔄 Statuts des demandes

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| 🟡 **En attente** | Demande soumise par le livreur | Approuver, Rejeter, Voir détails |
| 🔵 **Approuvée** | Validée par le magasin | Voir détails |
| 🟢 **Terminée** | Stock transféré avec succès | Voir détails |
| 🔴 **Rejetée** | Refusée par le magasin | Voir détails |

## 📦 Transfert automatique de stock

### Lors de l'approbation :

#### 1. Vérifications automatiques
- ✅ Stock disponible dans le magasin
- ✅ Quantités demandées vs disponibles
- ✅ Permissions utilisateur

#### 2. Transfert de stock
```
Magasin Central          →          Livreur Jean
Stock iPhone: 50         →          Stock iPhone: 5
Stock iPhone: 45         ←          Stock iPhone: 10
```

#### 3. Mouvements créés
- **Magasin** : Sortie de 5 iPhones (TRANSFER_OUT)
- **Livreur** : Entrée de 5 iPhones (SUPPLY)

## 🎯 Cas d'usage typiques

### Cas 1 : Réapprovisionnement quotidien
**Situation** : Livreur a vendu ses produits de la journée
1. **Livreur** : Demande 10 bouteilles d'eau + 5 sandwichs
2. **Magasin** : Approuve immédiatement
3. **Résultat** : Stock transféré, livreur peut continuer ses livraisons

### Cas 2 : Demande urgente
**Situation** : Commande importante, stock livreur insuffisant
1. **Livreur** : Demande produits spécifiques avec note "Urgent - Commande 15h"
2. **Magasin** : Voit la note, approuve rapidement
3. **Résultat** : Livreur peut honorer la commande

### Cas 3 : Stock insuffisant
**Situation** : Magasin n'a pas assez de stock
1. **Livreur** : Demande 20 produits
2. **Magasin** : Ajuste à 15 (stock disponible) et approuve
3. **Résultat** : Transfert partiel, livreur informé

### Cas 4 : Demande inappropriée
**Situation** : Demande excessive ou produits non prioritaires
1. **Livreur** : Demande 100 produits premium
2. **Magasin** : Rejette avec raison "Quantité excessive pour la zone"
3. **Résultat** : Livreur informé, peut refaire une demande ajustée

## 🔧 Fonctionnalités avancées

### Recherche et filtres
- **Recherche** : Par nom de livreur ou contenu des notes
- **Filtres** : Par statut (En attente, Approuvées, etc.)
- **Tri** : Par date de création (plus récent en premier)

### Gestion des quantités
- **Quantité demandée** : Ce que le livreur souhaite
- **Quantité approuvée** : Ce que le magasin valide (peut être différente)
- **Ajustement** : Possibilité de réduire les quantités lors de l'approbation

### Traçabilité complète
- **Historique** : Toutes les demandes avec dates et heures
- **Utilisateur** : Qui a approuvé/rejeté chaque demande
- **Mouvements** : Traçabilité des transferts de stock

## 🚨 Gestion des erreurs

### Erreurs courantes et solutions

#### "Stock insuffisant"
**Cause** : Magasin n'a pas assez de stock
**Solution** : Ajuster les quantités ou réapprovisionner le magasin

#### "Demande introuvable"
**Cause** : Demande supprimée ou ID incorrect
**Solution** : Actualiser la page, vérifier les permissions

#### "Erreur lors du transfert"
**Cause** : Problème technique lors du transfert
**Solution** : Réessayer, contacter l'administrateur si persistant

## 📈 Bonnes pratiques

### Pour les livreurs
- ✅ **Planifier** les demandes à l'avance
- ✅ **Ajouter des notes** explicatives si urgent
- ✅ **Vérifier** son stock actuel avant de demander
- ✅ **Demander** des quantités réalistes

### Pour les gestionnaires
- ✅ **Traiter** les demandes rapidement
- ✅ **Communiquer** les raisons de rejet clairement
- ✅ **Ajuster** les quantités si stock insuffisant
- ✅ **Surveiller** les patterns de demandes pour optimiser le stock

## 🎯 Résultats attendus

### Amélioration opérationnelle
- ⚡ **Réactivité** : Demandes traitées en temps réel
- 📊 **Traçabilité** : Historique complet des mouvements
- 🎯 **Précision** : Stock toujours à jour
- 🤝 **Communication** : Meilleure coordination magasin-livreurs

### Gains de productivité
- 🚀 **Rapidité** : Plus besoin d'appels téléphoniques
- 📱 **Mobilité** : Demandes depuis n'importe où
- 🔄 **Automatisation** : Transferts de stock automatiques
- 📈 **Optimisation** : Meilleure gestion des stocks

---

## ✅ Le système est maintenant opérationnel !

Les livreurs peuvent faire leurs demandes depuis la PWA et les gestionnaires peuvent les traiter efficacement depuis le CRM avec transfert automatique de stock. 🎉
