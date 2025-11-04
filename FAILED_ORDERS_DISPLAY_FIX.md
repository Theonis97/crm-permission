# 🔧 Correction de l'affichage des commandes échouées

## 🐛 Problème identifié

Les commandes échouées ne s'affichaient pas dans la page `dashboard/delivery-map` bien que :
- ✅ L'API retournait correctement 3 commandes échouées
- ✅ Le code était présent dans le composant
- ✅ Les données étaient récupérées via SWR

## 🔍 Cause racine

La section des commandes échouées était placée **à l'intérieur** de la `div` du header avec la classe `p-4 border-b bg-gray-50`. Cette div était fermée juste après les statistiques, ce qui empêchait l'affichage de la section des failed orders.

### Structure problématique (AVANT)

```tsx
<div className="p-4 border-b bg-gray-50">
  <h2>Livreurs actifs</h2>
  
  {/* Statistiques des commandes */}
  <div className="grid grid-cols-2 gap-2">
    ...
  </div>
  
  {/* Section commandes échouées - MAL PLACÉE ICI */}
  {failedOrdersCount > 0 && (
    <div className="mt-3 bg-orange-50">
      ...
    </div>
  )}
</div>  <!-- ❌ Cette div ferme le header ET la section failed orders -->

<ScrollArea className="flex-1">
  <!-- Liste des livreurs -->
</ScrollArea>
```

### Structure corrigée (APRÈS)

```tsx
<div className="p-4 border-b bg-gray-50">
  <h2>Livreurs actifs</h2>
  
  {/* Statistiques des commandes */}
  <div className="grid grid-cols-2 gap-2">
    ...
  </div>
</div>  <!-- ✅ Cette div ferme UNIQUEMENT le header -->

{/* Section commandes échouées - BIEN PLACÉE */}
<div className="px-4 py-3 border-b bg-orange-50">
  ...
</div>

<ScrollArea className="flex-1">
  <!-- Liste des livreurs -->
</ScrollArea>
```

## ✅ Corrections apportées

### 1. Déplacement de la section
La section des commandes échouées a été déplacée **en dehors** du header pour être une section indépendante.

### 2. Affichage permanent (pour debug)
Au lieu de `{failedOrdersCount > 0 && (...)}`, la section est maintenant **toujours affichée** :
- Fond **orange** si des commandes sont présentes
- Fond **gris** si aucune commande
- Message "Aucune commande en erreur pour le moment" si count = 0

### 3. Gestion conditionnelle de la liste
La liste des commandes n'est affichée que si `failedOrdersCount > 0`

### 4. Bouton désactivé si aucune commande
Le bouton "Tout voir et corriger" est `disabled` si `failedOrdersCount === 0`

### 5. Ajout de l'opérateur de coalescence nulle
`order.missingProducts?.slice(0, 2)` pour éviter les erreurs si `missingProducts` est undefined

## 📊 Test de vérification

L'API retourne bien les données :

```bash
curl "http://localhost:3000/api/orders/failed-whatsapp?status=PENDING"
```

Résultat :
```json
{
  "success": true,
  "data": [
    {
      "id": "cmhjwa4of0005md0kvpnk1pjn",
      "customerName": "Client_XXXX",
      "customerPhone": "062288533",
      "deliveryAddress": "Cimetière d'ambowe",
      "totalAmount": 10500,
      "missingProducts": ["Bassine pour bébé bleu"],
      "status": "PENDING"
    },
    // ... 2 autres commandes
  ],
  "count": 3
}
```

## 🎨 Apparence visuelle

### Avec commandes échouées (count > 0)
```
┌─────────────────────────────────────┐
│ ⚠️  Erreurs WhatsApp          [3] │ ← Fond orange
│ Produits non trouvés              │
│                                   │
│ ┌─────────────────────────────┐  │
│ │ Client_XXXX          →      │  │
│ │ 062288533                   │  │
│ │ [Bassine pour bébé bleu]    │  │
│ └─────────────────────────────┘  │
│                                   │
│ [Tout voir et corriger]          │
└─────────────────────────────────────┘
```

### Sans commandes échouées (count = 0)
```
┌─────────────────────────────────────┐
│ ⚠️  Erreurs WhatsApp          [0] │ ← Fond gris
│ Produits non trouvés              │
│                                   │
│ Aucune commande en erreur         │
│ pour le moment                    │
│                                   │
│ [Tout voir et corriger] (disabled) │
└─────────────────────────────────────┘
```

## 🔄 Comportement du refresh

- **Auto-refresh** : Toutes les 30 secondes
- **On focus** : Lorsque la page reprend le focus
- **Manuel** : Bouton "Rafraîchir" dans le header

## 📝 Code final

```tsx
{/* Section commandes échouées - toujours affichée */}
<div className={`px-4 py-3 border-b ${failedOrdersCount > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <span className="text-sm font-semibold text-orange-800">
        Erreurs WhatsApp
      </span>
    </div>
    <Badge variant="destructive" className="text-xs">
      {failedOrdersCount}
    </Badge>
  </div>
  
  <p className="text-xs text-orange-700 mb-2">
    Produits non trouvés
  </p>
  
  {/* Liste conditionnelle */}
  {failedOrdersCount > 0 && (
    <div className="space-y-2 mb-2 max-h-60 overflow-y-auto">
      {failedOrders.slice(0, 5).map((order: any) => (
        <div 
          key={order.id}
          className="bg-white rounded p-2 border border-orange-200 cursor-pointer hover:bg-orange-100"
          onClick={() => setIsFailedOrdersOpen(true)}
        >
          {/* Contenu de la carte */}
        </div>
      ))}
    </div>
  )}
  
  {failedOrdersCount > 5 && (
    <p className="text-xs text-orange-600 text-center mb-2">
      +{failedOrdersCount - 5} autres commande(s)
    </p>
  )}
  
  <Button
    variant="outline"
    size="sm"
    onClick={() => setIsFailedOrdersOpen(true)}
    className="w-full text-xs border-orange-300 hover:bg-orange-100"
    disabled={failedOrdersCount === 0}
  >
    Tout voir et corriger
  </Button>
  
  {failedOrdersCount === 0 && (
    <p className="text-xs text-gray-500 text-center mt-2">
      Aucune commande en erreur pour le moment
    </p>
  )}
</div>
```

## ✅ Checklist finale

- [x] Section déplacée en dehors du header
- [x] Structure DOM correcte
- [x] Affichage permanent pour visibilité
- [x] Liste conditionnelle si count > 0
- [x] Bouton désactivé si count = 0
- [x] Message informatif si count = 0
- [x] Gestion des undefined avec `?.`
- [x] Auto-refresh configuré
- [x] Click handlers fonctionnels
- [x] Logs de debug retirés

## 🎉 Résultat

La section des commandes échouées s'affiche maintenant correctement dans la sidebar de la page Delivery Map, entre les statistiques et la liste des livreurs.
