# Workflow d'Approvisionnement Magasin → Entrepôt

## 📅 Date : 13 Octobre 2025

---

## 🎯 Changement Important

**Avant :** L'ajustement de stock modifiait directement le stock du magasin

**Maintenant :** Création d'une **demande d'approvisionnement** vers l'entrepôt qui suit un workflow professionnel

---

## 🔄 Nouveau Workflow

### Étape 1 : Demande (Magasin)
```
Gérant du magasin
    ↓
Ouvre le produit dans le sheet
    ↓
Clique "Commander"
    ↓
Saisit la quantité + motif
    ↓
Créer la demande
    ↓
Status: PENDING
```

### Étape 2 : Validation (Entrepôt)
```
Gestionnaire entrepôt
    ↓
Reçoit la demande
    ↓
Vérifie disponibilité
    ↓
Approuve/Rejette
    ↓
Status: APPROVED / REJECTED
```

### Étape 3 : Livraison
```
Commande approuvée
    ↓
Préparation entrepôt
    ↓
Livraison au magasin
    ↓
Réception et validation
    ↓
Stock magasin mis à jour
    ↓
Status: DELIVERED
```

---

## ✨ Interface Modifiée

### Footer du Sheet Produit

**Avant :**
```
[Ajuster stock] [Paramètres magasin] [Modifier produit]
```

**Après :**
```
[🚚 Commander] [🏷️ Paramètres magasin] [✏️ Modifier produit]
```

### Nouveau Dialog : "Demander un approvisionnement"

```
╔══════════════════════════════════════════╗
║  Demander un approvisionnement           ║
║  Créer une demande pour Coca-Cola 1.5L   ║
╠══════════════════════════════════════════╣
║                                          ║
║  Quantité à commander                    ║
║  ┌────────────────────────────────────┐  ║
║  │ 50                                 │  ║
║  └────────────────────────────────────┘  ║
║  💡 La demande sera envoyée à           ║
║     l'entrepôt pour validation          ║
║                                          ║
║  Motif / Note (optionnel)                ║
║  ┌────────────────────────────────────┐  ║
║  │ Stock faible, forte demande        │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │ 📊 Informations                    │  ║
║  │ Stock actuel:        15            │  ║
║  │ Stock minimum:       20            │  ║
║  │ ─────────────────────────────      │  ║
║  │ Quantité demandée:   +50           │  ║
║  │ Coût estimé:         75,000 FCFA   │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  ┌────────────────────────────────────┐  ║
║  │ ⚠️ Cette demande sera en statut    │  ║
║  │ "En attente" jusqu'à validation    │  ║
║  │ par l'entrepôt.                    │  ║
║  └────────────────────────────────────┘  ║
║                                          ║
║  [Annuler]         [Créer la demande]    ║
╚══════════════════════════════════════════╝
```

---

## 🔧 Modifications Techniques

### Fonction `handleAdjustStock` (Avant)
```typescript
// ❌ Modification directe du stock
const response = await fetch(`/api/stores/${storeId}/products/${productId}`, {
  method: "PATCH",
  body: JSON.stringify({
    stock: newStock
  })
})
```

### Fonction `handleAdjustStock` (Après)
```typescript
// ✅ Création d'une demande d'approvisionnement
const response = await fetch(`/api/restocking-orders`, {
  method: "POST",
  body: JSON.stringify({
    storeId,
    items: [{
      productId,
      name,
      sku,
      requestedQuantity: quantity,
      unitCost,
      total
    }],
    notes,
    priority: "NORMAL"
  })
})
```

### Validation des Données
```typescript
// ❌ AVANT : Acceptait des quantités négatives
const quantity = parseInt(adjustQuantity)

// ✅ APRÈS : Seulement des quantités positives
const quantity = parseInt(adjustQuantity)
if (isNaN(quantity) || quantity <= 0) {
  toast.error("Quantité invalide (doit être positive)")
  return
}
```

---

## 📊 Données Envoyées

### Structure de la Demande
```json
{
  "storeId": "store-123",
  "items": [
    {
      "productId": "prod-456",
      "name": "Coca-Cola 1.5L",
      "sku": "COCA-1.5L",
      "requestedQuantity": 50,
      "unitCost": 1500,
      "total": 75000
    }
  ],
  "notes": "Stock faible, forte demande",
  "priority": "NORMAL"
}
```

### Réponse API (201 Created)
```json
{
  "id": "order-789",
  "number": "RST-00001",
  "status": "PENDING",
  "storeId": "store-123",
  "totalQuantity": 50,
  "totalCost": 75000,
  "requestedBy": "user-123",
  "createdAt": "2025-10-13T20:00:00Z",
  "items": [...],
  "store": {...},
  "requester": {...}
}
```

---

## 🎨 Toast de Confirmation

**Message principal :**
```
✅ Demande d'approvisionnement créée (50 unité(s))
```

**Description :**
```
En attente de validation par l'entrepôt
```

**Durée :** 5 secondes

---

## 📈 Avantages du Nouveau Workflow

### 1. **Contrôle et Traçabilité**
- ✅ Toutes les demandes sont enregistrées
- ✅ Historique complet des approvisionnements
- ✅ Numéro de commande unique (RST-XXXXX)
- ✅ Statuts clairs (PENDING, APPROVED, REJECTED, DELIVERED)

### 2. **Gestion des Stocks Optimisée**
- ✅ L'entrepôt valide la disponibilité avant livraison
- ✅ Évite les promesses impossibles à tenir
- ✅ Permet la priorisation des demandes
- ✅ Gestion des quantités approuvées vs demandées

### 3. **Workflow Professionnel**
- ✅ Séparation des rôles (magasin vs entrepôt)
- ✅ Process de validation
- ✅ Notifications possibles
- ✅ Rapports et analytics

### 4. **Transparence**
- ✅ Le magasin voit le statut de sa demande
- ✅ L'entrepôt voit toutes les demandes en attente
- ✅ Coût estimé calculé automatiquement
- ✅ Notes et motifs enregistrés

---

## 🔍 Détection Automatique des Besoins

### Suggestions Futures
```typescript
// Alerte automatique si stock < minStock
if (currentStock < minStock) {
  suggestedQuantity = minStock * 2 - currentStock
  showAlert("Stock faible ! Suggéré: " + suggestedQuantity)
}
```

**Exemple :**
```
Stock actuel:   15
Stock minimum:  20
Stock suggéré:  40 (pour avoir 2× le minimum)
Quantité à commander: 25
```

---

## 📊 Statuts des Demandes

| Statut | Description | Action Magasin | Action Entrepôt |
|--------|-------------|----------------|-----------------|
| **PENDING** | En attente de validation | Attendre | Approuver/Rejeter |
| **APPROVED** | Approuvée, en préparation | Attendre livraison | Préparer commande |
| **REJECTED** | Rejetée | Voir motif, nouvelle demande | - |
| **DELIVERED** | Livrée et reçue | Vérifier réception | Archiver |

---

## 🧪 Tests Recommandés

### Test 1 : Créer une Demande Simple
```bash
1. Ouvrir un produit dans le sheet
2. Cliquer "Commander"
3. Saisir quantité: 50
4. Saisir motif: "Stock faible"
5. Cliquer "Créer la demande"
6. ✅ Vérifier le toast de confirmation
7. ✅ Vérifier la création dans la base (status: PENDING)
```

### Test 2 : Validation des Données
```bash
1. Ouvrir le dialog "Commander"
2. Essayer quantité: 0
   ✅ Erreur: "Quantité invalide"
3. Essayer quantité: -10
   ✅ Erreur: "Quantité invalide"
4. Essayer quantité vide
   ✅ Bouton désactivé
```

### Test 3 : Calcul du Coût
```bash
1. Produit avec prix achat: 1500 FCFA
2. Saisir quantité: 50
3. ✅ Vérifier coût estimé: 75,000 FCFA
4. Changer quantité: 100
5. ✅ Vérifier coût estimé: 150,000 FCFA
```

### Test 4 : Affichage Stock
```bash
1. Produit avec stock: 15, minStock: 20
2. Ouvrir "Commander"
3. ✅ Vérifier affichage stock actuel: 15
4. ✅ Vérifier affichage stock minimum: 20
5. ✅ Vérifier badge "Stock faible" visible
```

---

## 🚀 Améliorations Futures

### Court Terme
- [ ] Liste des demandes en attente (page dédiée)
- [ ] Notification à l'entrepôt
- [ ] Badge de compteur (nombre de demandes en attente)
- [ ] Filtrage par statut

### Moyen Terme
- [ ] Suggestion automatique de quantité
- [ ] Historique des demandes par produit
- [ ] Export Excel des demandes
- [ ] Graphiques d'analyse des approvisionnements

### Long Terme
- [ ] Approvisionnement automatique (seuil atteint)
- [ ] Prédiction des besoins (IA)
- [ ] Optimisation des livraisons groupées
- [ ] Intégration avec transporteurs

---

## 📁 Fichiers Modifiés

### Frontend (1 fichier)
1. ✅ `components/stores/store-product-details-sheet.tsx`
   - Import Truck icon
   - handleAdjustStock → Création demande
   - Dialog redesigné
   - Footer bouton "Commander"
   - Validation quantités positives
   - Calcul coût estimé
   - Alerte status "En attente"

### Backend (déjà existant)
- ✅ `app/api/restocking-orders/route.ts` (corrigé précédemment)

---

## 📝 Notes Importantes

### Permissions
**Requises :**
- `products.create` - Pour créer une demande d'approvisionnement

**Vérification :**
- L'API vérifie les permissions avant création
- Erreur 403 si permission refusée

### Prix Utilisé
**Pour le calcul du coût :**
```typescript
unitCost = product.prixAchat || 0
total = unitCost × requestedQuantity
```

**Si le magasin a un prix d'achat spécifique :**
```typescript
// Utilise le prix du magasin si défini
unitCost = product.storePrixAchat || product.prixAchat || 0
```

### Numéro de Commande
**Format :** `RST-00001`, `RST-00002`, etc.

**Génération :**
```typescript
const count = await prisma.order.count()
const number = `RST-${String(count + 1).padStart(5, "0")}`
```

---

## 🔗 Relations avec Autres Fonctionnalités

### 1. Prix Spécifiques Magasin
- Le coût estimé utilise le prix d'achat du magasin si défini
- Sinon utilise le prix de l'entrepôt

### 2. Seuils de Stock
- Affiche le stock minimum pour contexte
- Permet de calculer la quantité nécessaire

### 3. Statistiques Produit
- Les demandes approuvées et livrées alimentent les stats
- Analyse des besoins en approvisionnement

---

## ✅ Checklist Finale

- [x] Import icône Truck
- [x] Fonction handleAdjustStock modifiée
- [x] Validation quantités positives uniquement
- [x] Dialog redesigné
- [x] Calcul coût estimé
- [x] Affichage stock actuel/minimum
- [x] Alerte statut "En attente"
- [x] Toast avec description
- [x] Bouton "Commander" dans footer
- [x] Documentation complète

---

**Workflow professionnel implémenté avec succès ! 🚚✅**

Le système suit maintenant un processus réaliste de demande → validation → livraison, avec traçabilité complète.
