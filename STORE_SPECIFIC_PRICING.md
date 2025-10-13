# Prix et Seuils Spécifiques par Magasin

## 📅 Date : 13 Octobre 2025

---

## 🎯 Problème Identifié

Les produits dans les magasins utilisaient les **mêmes prix et seuils de stock** que l'entrepôt, ce qui n'est pas réaliste.

**Exemple :**
- Un Coca-Cola peut coûter **2000 FCFA** à l'entrepôt
- Mais être vendu **2500 FCFA** dans le magasin A (centre-ville)
- Et **2200 FCFA** dans le magasin B (périphérie)

---

## ✨ Solution Implémentée

Ajout de champs spécifiques au modèle `StoreProduct` permettant de définir des **prix et seuils de stock personnalisés** pour chaque magasin.

---

## 📊 Modifications du Schéma Prisma

### Modèle StoreProduct (Avant)
```prisma
model StoreProduct {
  id        String   @id @default(cuid())
  storeId   String
  productId String
  stock     Int      @default(0)
  minStock  Int      @default(0)
  isActive  Boolean  @default(true)
  // ...
}
```

### Modèle StoreProduct (Après)
```prisma
model StoreProduct {
  id         String   @id @default(cuid())
  storeId    String
  productId  String
  stock      Int      @default(0)
  minStock   Int      @default(0)
  maxStock   Int?     @map("max_stock")        // ✨ NOUVEAU
  prixVente  Float?   @map("prix_vente")       // ✨ NOUVEAU
  prixAchat  Float?   @map("prix_achat")       // ✨ NOUVEAU
  isActive   Boolean  @default(true)
  // ...
}
```

### Nouveaux Champs

| Champ | Type | Description | Optionnel |
|-------|------|-------------|-----------|
| `prixVente` | Float | Prix de vente dans ce magasin | ✅ Oui |
| `prixAchat` | Float | Prix d'achat/coût dans ce magasin | ✅ Oui |
| `maxStock` | Int | Seuil maximum de stock (alerte surstockage) | ✅ Oui |

**Logique :**
- Si `prixVente` est défini → Utiliser ce prix pour le magasin
- Sinon → Utiliser le prix de l'entrepôt (Product.prixVente)

---

## 🔧 Modifications API

### 1. GET `/api/stores/[id]/products`

**Retour enrichi :**
```json
{
  "id": "product-123",
  "name": "Coca-Cola 1.5L",
  
  // Prix effectifs (magasin ou entrepôt)
  "prixVente": 2500,        // Prix utilisé (magasin si défini, sinon entrepôt)
  "prixAchat": 1800,
  "minStock": 20,
  "maxStock": 200,
  
  // Prix de l'entrepôt (pour comparaison)
  "warehousePrixVente": 2000,
  "warehousePrixAchat": 1500,
  
  // Prix spécifiques du magasin (null si non défini)
  "storePrixVente": 2500,
  "storePrixAchat": 1800,
  "storeMinStock": 20,
  "storeMaxStock": 200
}
```

### 2. PATCH `/api/stores/[id]/products/[productId]`

**Body accepté (nouveaux champs) :**
```json
{
  "stock": 50,           // Stock actuel
  "minStock": 20,        // Seuil minimum ✨
  "maxStock": 200,       // Seuil maximum ✨ NOUVEAU
  "prixVente": 2500,     // Prix de vente ✨ NOUVEAU
  "prixAchat": 1800      // Prix d'achat ✨ NOUVEAU
}
```

**Validation :**
- Prix ≥ 0
- Stock min/max ≥ 0
- Tous les champs optionnels

---

## 🎨 Interface Utilisateur

### Nouveau Dialog : "Paramètres magasin"

**Emplacement :** Sheet de détails du produit → Footer → Bouton "Paramètres magasin"

**Contenu :**

#### Section 1 : Prix
```
┌─────────────────────────────────────────┐
│ Prix de vente (FCFA)                    │
│ (Entrepôt: 2000 FCFA)                   │
│ [2500                              ] ←─┐ │
│ 💡 Laissez vide pour utiliser le prix  │ │
│    de l'entrepôt                        │ │
└─────────────────────────────────────────┘ │
                                            │
┌─────────────────────────────────────────┐ │
│ Prix d'achat (FCFA)                     │ │
│ (Entrepôt: 1500 FCFA)                   │ │
│ [1800                              ] ←─┐ │ │
│ 💡 Optionnel - Pour calculer la marge   │ │ │
│    spécifique au magasin                │ │ │
└─────────────────────────────────────────┘ │ │
                                            │ │
                                            │ │
━━━ Seuils de stock ━━━━━━━━━━━━━━━━━━━━━━━ │ │
                                            │ │
┌─────────────────────────────────────────┐ │ │
│ Stock minimum (alerte)                  │ │ │
│ (Entrepôt: 10)                          │ │ │
│ [20                                ] ←─┐ │ │ │
└─────────────────────────────────────────┘ │ │ │
                                            │ │ │
┌─────────────────────────────────────────┐ │ │ │
│ Stock maximum (optionnel)               │ │ │ │
│ (Entrepôt: 100)                         │ │ │ │
│ [200                               ] ←─┐ │ │ │ │
│ Alerte si le stock dépasse ce seuil     │ │ │ │ │
└─────────────────────────────────────────┘ │ │ │ │
                                            │ │ │ │
                                            │ │ │ │
━━━ Aperçu marge ━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │ │ │
                                            │ │ │ │
┌─────────────────────────────────────────┐ │ │ │ │
│ Marge brute:           700 FCFA  ◄──────┘ │ │ │
│ Marge (%):             38.9%     ◄────────┘ │ │
└─────────────────────────────────────────┘   │ │
                                              │ │
[Annuler]            [Enregistrer] ◄──────────┘ │
                                                │
Calcul automatique de la marge ◄───────────────┘
```

### Boutons d'Action (Footer)

**Avant :**
```
[Ajuster le stock] [Modifier le produit]
```

**Après :**
```
[Ajuster stock] [Paramètres magasin] [Modifier produit]
      ↓                  ↓                    ↓
   Outline          Outline + Tag        Blue primary
```

---

## 💡 Cas d'Usage

### Scénario 1 : Prix Différents par Zone

**Contexte :** Vous avez 3 magasins dans des zones différentes

```
Produit: Coca-Cola 1.5L
Prix entrepôt: 1500 FCFA (achat) / 2000 FCFA (vente)

Magasin Centre-Ville:
  - Prix vente: 2500 FCFA (+25%)
  - Prix achat: 1800 FCFA (transport + taxes)
  - Marge: 700 FCFA (38.9%)

Magasin Périphérie:
  - Prix vente: 2200 FCFA (+10%)
  - Prix achat: 1600 FCFA
  - Marge: 600 FCFA (37.5%)

Magasin Marché:
  - Prix vente: Non défini → Utilise 2000 FCFA (entrepôt)
  - Prix achat: Non défini → Utilise 1500 FCFA (entrepôt)
  - Marge: 500 FCFA (33.3%)
```

### Scénario 2 : Seuils de Stock Différents

**Contexte :** Volumes de vente différents par magasin

```
Produit: Coca-Cola 1.5L
Seuils entrepôt: min=50, max=500

Magasin Grande Surface:
  - Stock min: 100 (forte demande)
  - Stock max: 500 (grand espace)

Magasin Boutique:
  - Stock min: 20 (faible demande)
  - Stock max: 80 (espace limité)
```

---

## ✅ Avantages

### 1. **Flexibilité des Prix**
- Prix adaptés à chaque zone géographique
- Gestion de la concurrence locale
- Marges optimisées par magasin

### 2. **Gestion du Stock**
- Seuils adaptés aux volumes de vente
- Alertes personnalisées
- Évite surstockage/rupture

### 3. **Reporting Précis**
- Marges réelles par magasin
- Comparaison entrepôt vs magasin
- Performance par point de vente

### 4. **Simplicité**
- Champs optionnels (fallback sur entrepôt)
- Interface claire avec comparaisons
- Calcul automatique des marges

---

## 🔄 Migration Base de Données

### Étapes Requises

1. **Ajouter les colonnes au schéma**
```bash
# Déjà fait dans schema.prisma
```

2. **Créer la migration**
```bash
npx prisma migrate dev --name add_store_product_pricing
```

3. **Appliquer la migration**
```bash
npx prisma migrate deploy
```

### Script SQL Généré
```sql
-- AlterTable
ALTER TABLE "store_products" 
ADD COLUMN "max_stock" INTEGER,
ADD COLUMN "prix_vente" DOUBLE PRECISION,
ADD COLUMN "prix_achat" DOUBLE PRECISION;
```

**Note :** Les colonnes sont NULLABLE, donc aucun impact sur les données existantes.

---

## 📈 Affichage dans l'Interface

### Page Produits du Magasin

**Prix affiché :**
- Utilise `prixVente` du StoreProduct si défini
- Sinon utilise `prixVente` du Product (entrepôt)

**Badge "Prix personnalisé" :**
- Affiché si `storePrixVente !== null`
- Couleur : Badge bleu
- Texte : "Prix magasin"

### Sheet Détails Produit

**Section Tarification :**
```
Prix de vente: 2500 FCFA        ← Prix effectif
               (2000 FCFA entrepôt)  ← Prix entrepôt en gris

Prix d'achat: 1800 FCFA         ← Prix effectif
              (1500 FCFA entrepôt)   ← Prix entrepôt en gris

Marge brute: 700 FCFA           ← Marge du magasin
Marge (%): 38.9%                ← Marge du magasin
```

---

## 🧪 Tests Recommandés

### Test 1 : Prix Personnalisés
1. ✅ Ouvrir un produit dans un magasin
2. ✅ Cliquer "Paramètres magasin"
3. ✅ Définir un prix de vente différent (ex: 2500 au lieu de 2000)
4. ✅ Enregistrer
5. ✅ Vérifier que le prix affiché est 2500 FCFA
6. ✅ Vérifier que la comparaison avec l'entrepôt s'affiche

### Test 2 : Fallback sur Entrepôt
1. ✅ Créer un produit dans un magasin (sans prix personnalisé)
2. ✅ Vérifier que le prix de l'entrepôt s'affiche
3. ✅ Modifier le prix de l'entrepôt
4. ✅ Vérifier que le magasin reflète le changement

### Test 3 : Seuils de Stock
1. ✅ Définir minStock=20, maxStock=200 pour un magasin
2. ✅ Mettre le stock à 10 → Badge "Stock faible"
3. ✅ Mettre le stock à 250 → Badge "Surstockage" (si implémenté)

### Test 4 : Calcul de Marge
1. ✅ Définir prixVente=2500, prixAchat=1800
2. ✅ Vérifier aperçu : Marge brute = 700 FCFA
3. ✅ Vérifier aperçu : Marge % = 38.9%

---

## 🚀 Améliorations Futures

### Court Terme
- [ ] Badge "Prix personnalisé" sur la liste des produits
- [ ] Historique des changements de prix
- [ ] Export des prix par magasin (Excel)
- [ ] Alerte de surstockage (si stock > maxStock)

### Moyen Terme
- [ ] Règles de prix automatiques (ex: +10% sur entrepôt)
- [ ] Prix par tranche de dates (promotions)
- [ ] Comparateur de prix entre magasins
- [ ] Suggestions de prix basées sur la concurrence

### Long Terme
- [ ] Prix dynamiques basés sur la demande
- [ ] Optimisation automatique des marges
- [ ] A/B testing des prix
- [ ] Intégration avec systèmes de caisse

---

## 📝 Notes Importantes

### Prix NULL vs 0
- **NULL** : Utilise le prix de l'entrepôt (fallback)
- **0** : Prix explicitement défini à 0 (gratuit)

### Validation
- Prix de vente ≥ 0
- Prix d'achat ≥ 0
- Stock min/max ≥ 0
- Tous les champs optionnels

### Performance
- Pas d'impact sur les requêtes existantes
- Index existants toujours valides
- Colonnes NULLABLE = pas de migration de données

---

## 🔗 Fichiers Modifiés

### Backend (2 fichiers)
1. `prisma/schema.prisma` - Ajout des champs
2. `app/api/stores/[id]/products/route.ts` - Retour enrichi
3. `app/api/stores/[id]/products/[productId]/route.ts` - Mise à jour

### Frontend (1 fichier)
1. `components/stores/store-product-details-sheet.tsx`
   - Nouveau dialog "Paramètres magasin"
   - Fonction handleSavePrice
   - Calcul de marge en temps réel
   - Footer avec 3 boutons

---

**Implémentation terminée avec succès ! 🎯**

Chaque magasin peut maintenant avoir ses propres prix et seuils de stock, tout en conservant la simplicité d'un fallback sur l'entrepôt.
