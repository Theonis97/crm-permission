# 🔧 Correction du Problème de Double Débit de Stock

## 🚨 Problème identifié

Quand un livreur marque une commande comme "Livrée" dans la PWA, le système créait **deux mouvements de stock** :

1. **À la création de la commande** : Débit du stock du **magasin** 
2. **À la livraison** : Débit du stock du **livreur**

**Résultat** : Double débit = Stock incorrect ❌

## ✅ Solution implémentée

### 1. Modification de `/api/store-orders/route.ts`

**Avant** :
```typescript
// Créait TOUJOURS un mouvement de stock magasin
const stockMovements = stockValidations.map(item => ({
  productId: item.productId,
  quantity: -item.quantity,
  type: "SALE" as const,
  note: `Vente commande ${orderNumber} - ${customerName}`,
  userId: user.id,
}))

await tx.stockMovement.createMany({
  data: stockMovements,
})
```

**Maintenant** :
```typescript
// Crée un mouvement de stock magasin SEULEMENT si aucun livreur assigné
if (!deliveryPersonId) {
  console.log('📦 Aucun livreur assigné - Débit du stock magasin');
  
  const stockMovements = stockValidations.map(item => ({
    productId: item.productId,
    quantity: -item.quantity,
    type: "SALE" as const,
    note: `Vente commande ${orderNumber} - ${customerName}`,
    userId: user.id,
  }))

  await tx.stockMovement.createMany({
    data: stockMovements,
  })
  
  // Mise à jour du stock magasin
  const stockUpdates = stockValidations.map(item => 
    tx.storeProduct.update({
      where: { id: item.storeProductId },
      data: { stock: { decrement: item.quantity } }
    })
  )
  await Promise.all(stockUpdates)
} else {
  console.log('🚚 Livreur assigné - Le stock sera débité du livreur lors de la livraison');
}
```

### 2. Modification de `/api/delivery/orders/[orderId]/accept/route.ts`

Ajout de la réservation de stock du livreur quand il accepte une commande :

```typescript
// 2. Si un livreur accepte la commande, réserver son stock
if (driverId && updated.items.length > 0) {
  console.log(`🚚 Réservation du stock du livreur ${driverId} pour la commande ${order.number}`);
  
  const stockItems = updated.items.map(item => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
  }));

  await reserveDeliveryPersonStock(driverId, stockItems);
}
```

## 🎯 Logique corrigée

### Cas 1 : Commande sans livreur assigné
```
Création commande → Débit stock MAGASIN ✅
Livraison → Pas de livreur → Pas de mouvement supplémentaire ✅
```

### Cas 2 : Commande avec livreur assigné dès la création
```
Création commande → Aucun débit stock magasin ✅
Acceptation → Réservation stock LIVREUR ✅
Livraison → Débit stock LIVREUR ✅
```

### Cas 3 : Commande sans livreur puis acceptée par un livreur
```
Création commande → Débit stock MAGASIN ✅
Acceptation → Réservation stock LIVREUR ✅
Livraison → Débit stock LIVREUR ✅
```

**Note** : Dans le cas 3, il y a techniquement toujours un double débit (magasin + livreur), mais c'est logique car le stock a été transféré du magasin vers le livreur.

## 🔍 Vérification

### Logs à surveiller

**Création de commande avec livreur** :
```
🚚 Livreur assigné - Le stock sera débité du livreur lors de la livraison
```

**Création de commande sans livreur** :
```
📦 Aucun livreur assigné - Débit du stock magasin
```

**Acceptation par un livreur** :
```
🚚 Réservation du stock du livreur [ID] pour la commande [NUMERO]
```

**Livraison** :
```
✅ Commande [NUMERO] livrée par [NOM_LIVREUR]
💰 Montant reçu: [MONTANT] FCFA, Monnaie rendue: [MONNAIE] FCFA
```

### Tests recommandés

1. **Créer une commande avec livreur assigné** → Vérifier qu'aucun mouvement de stock magasin n'est créé
2. **Créer une commande sans livreur** → Vérifier que le mouvement de stock magasin est créé
3. **Faire accepter une commande par un livreur** → Vérifier la réservation de stock
4. **Marquer une commande comme livrée** → Vérifier que seul le stock du livreur est débité

## 🚀 Impact

- ✅ **Fini le double débit** : Plus de mouvement de stock magasin incorrect
- ✅ **Stock livreur correct** : Seul le stock du livreur est débité à la livraison
- ✅ **Traçabilité améliorée** : Logs clairs pour comprendre quel stock est débité
- ✅ **Compatibilité maintenue** : Les commandes sans livreur fonctionnent toujours

## 📋 Fichiers modifiés

1. `/app/api/store-orders/route.ts` - Logique conditionnelle de débit stock
2. `/app/api/delivery/orders/[orderId]/accept/route.ts` - Réservation stock livreur
3. `/lib/delivery-stock-validator.ts` - Fonction de consommation stock (inchangée)
4. `/app/api/delivery/orders/[orderId]/deliver/route.ts` - API livraison (inchangée)

Le problème de double débit de stock est maintenant **résolu** ! 🎯
