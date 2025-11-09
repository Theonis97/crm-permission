# Design des documents de vente (Devis & Factures)

## 🎨 Concept

Interface de création de devis et factures avec un **design professionnel** qui ressemble à un **vrai document commercial**.

## ✅ Caractéristiques principales

### **1. Sheet latéral** (pas de modal)
- Ouverture depuis la droite
- Pleine largeur pour afficher le document
- Scroll intégré pour les longs documents

### **2. Mise en page professionnelle**

#### **En-tête coloré**
- **Devis** : Gradient orange avec icône et titre
- **Facture** : Gradient vert avec icône et titre
- Logo/nom entreprise à gauche
- Numéro et date à droite
- Style corporate moderne

#### **Bloc informations**
- **2 colonnes** : Client | Détails document
- Client : Sélection + affichage complet des infos dans un bloc
- Détails : Numéro, dates, conditions (tout en un)

#### **Tableau des articles**
- **Style professionnel** avec bordure épaisse en haut
- Colonnes : Description | Qté | P.U. HT | Remise | Total HT
- Sélection produit + description éditable
- Calculs automatiques en temps réel
- Bouton suppression par ligne

#### **Bloc totaux**
- **Aligné à droite** (style facture classique)
- Sous-total, remises, total HT
- **Facture uniquement** : TVA 18% + Total TTC
- Bloc final avec fond coloré et gros texte

#### **Notes et conditions**
- Zone de texte libre
- Mentions légales adaptées (devis/facture)

#### **Footer**
- Fond gris avec mentions légales
- Boutons d'action (Annuler / Enregistrer)
- Style cohérent avec le document

## 🎯 Différences Devis vs Facture

| Élément | Devis | Facture |
|---------|-------|---------|
| **Couleur** | Orange | Vert |
| **Titre** | DEVIS | FACTURE |
| **Date validité** | Valable jusqu'au | Date d'échéance |
| **Conditions** | - | Conditions de paiement (15/30/45/60j) |
| **TVA** | Non affichée | TVA 18% affichée |
| **Total** | Total HT | Total TTC |
| **Mentions** | Validité 30 jours | Pénalités retard + CGV |

## 📋 Composants créés

- `create-quote-sheet-v2.tsx` - Devis avec design document
- `create-invoice-sheet-v2.tsx` - Facture avec design document

## 🚀 Utilisation

```tsx
<CreateQuoteSheet
  open={showCreateQuote}
  onOpenChange={setShowCreateQuote}
  onSuccess={() => {
    fetchStats()
  }}
/>

<CreateInvoiceSheet
  open={showCreateInvoice}
  onOpenChange={setShowCreateInvoice}
  onSuccess={() => {
    fetchStats()
  }}
/>
```

## ✨ Fonctionnalités

- ✅ Numérotation automatique (DEV-YYYYMMDD-HHMM / FAC-YYYYMMDD-HHMM)
- ✅ Sélection client depuis la base
- ✅ Sélection produits avec prix automatique
- ✅ Calculs automatiques (quantité × prix - remise)
- ✅ TVA automatique pour les factures
- ✅ Dates intelligentes (aujourd'hui + 30 jours par défaut)
- ✅ Conditions de paiement prédéfinies
- ✅ Validation des champs requis
- ✅ Toast notifications
- ✅ Design responsive

## 🎨 Principes de design appliqués

1. **Pas de cards imbriquées** - Design épuré
2. **Hiérarchie visuelle claire** - Titres, séparateurs, espaces
3. **Couleurs cohérentes** - Orange pour devis, vert pour factures
4. **Typographie professionnelle** - Police mono pour numéros
5. **Mise en page classique** - Comme un vrai document commercial
6. **Actions visibles** - Boutons clairs en bas de page

## 📦 Dépendances

- Shadcn UI components (Sheet, Table, Select, Input, etc.)
- Lucide React pour les icônes
- Sonner pour les notifications

## 🔄 Intégration

Les sheets sont intégrés dans la page `/dashboard/sales` et s'ouvrent via le bouton "Créer" dans le header.
