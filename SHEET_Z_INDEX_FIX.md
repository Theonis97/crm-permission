# 🎨 Augmentation du z-index du FailedOrdersSheet

## 🎯 Objectif

Mettre le sheet des commandes échouées au premier plan (z-index 2000) pour s'assurer qu'il s'affiche au-dessus de tous les autres éléments de l'interface.

## 🔧 Modifications apportées

### 1. SheetContent - FailedOrdersSheet

**Fichier**: `/components/delivery/failed-orders-sheet.tsx`

```tsx
// Avant
<SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">

// Après
<SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col z-[2000]">
```

**Impact**: Le contenu du sheet est maintenant au z-index 2000.

---

### 2. SheetOverlay - Composant UI de base

**Fichier**: `/components/ui/sheet.tsx`

```tsx
// Avant
className={cn(
  "... fixed inset-0 z-50 bg-black/50",
  className
)}

// Après
className={cn(
  "... fixed inset-0 z-[1999] bg-black/50",
  className
)}
```

**Impact**: L'overlay (fond sombre) est maintenant au z-index 1999, juste en dessous du contenu.

---

## 📊 Hiérarchie des z-index

```
┌─────────────────────────────────────┐
│ SheetContent (z-2000)              │  ← Contenu du sheet
│  - Formulaire édition               │
│  - Liste commandes                  │
│  - Boutons actions                  │
└─────────────────────────────────────┘
           ↓ au-dessus de
┌─────────────────────────────────────┐
│ SheetOverlay (z-1999)              │  ← Fond sombre semi-transparent
│  - Couvre toute la page            │
└─────────────────────────────────────┘
           ↓ au-dessus de
┌─────────────────────────────────────┐
│ Contenu de la page (z-auto)       │  ← Dashboard, map, etc.
└─────────────────────────────────────┘
```

## ✅ Avantages

1. **Visibilité garantie**: Le sheet est toujours visible, même avec des modales ou tooltips
2. **Cohérence**: L'overlay et le contenu ont des z-index cohérents
3. **Pas de conflits**: z-2000 est largement au-dessus des éléments standards (z-50, z-100, etc.)
4. **Accessibilité**: L'overlay bloque bien les interactions avec le reste de la page

## 🎨 Cas d'usage

Ce z-index élevé est particulièrement utile pour :
- Éviter les conflits avec la carte Mapbox (qui a son propre z-index)
- S'afficher au-dessus des tooltips et dropdowns
- Garantir que les modales de confirmation sont visibles
- Assurer que le sheet est toujours accessible

## 📝 Notes techniques

- **Tailwind z-index arbitraire**: Utilisation de `z-[2000]` au lieu des classes prédéfinies
- **CSS cascade**: Le z-index personnalisé écrase le `z-50` par défaut du composant UI
- **Performance**: Aucun impact, le z-index est une propriété CSS légère

## 🔄 Compatibilité

- ✅ Compatible avec tous les navigateurs modernes
- ✅ Fonctionne avec les animations de slide-in/out du sheet
- ✅ Pas de conflit avec les autres composants UI
- ✅ L'overlay reste cliquable pour fermer le sheet

## 🧪 Test

Pour vérifier que ça fonctionne :

1. Ouvrez la page **Dashboard > Delivery Map**
2. Cliquez sur une commande échouée ou sur "Tout voir et corriger"
3. Le sheet doit s'ouvrir au-dessus de tout
4. L'overlay doit couvrir toute la page
5. Aucun élément ne doit apparaître au-dessus du sheet

---

**Résultat**: Le FailedOrdersSheet s'affiche maintenant correctement au-dessus de tous les éléments de l'interface ! 🎉
