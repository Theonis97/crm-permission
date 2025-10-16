# Refactoring du Modal de Checkout - Plan de Migration

## 🎯 Objectifs

1. **Extraire le modal** en composant séparé (`CheckoutModal.tsx`)
2. **Utiliser un Select** pour la sélection des livreurs au lieu de boutons
3. **Améliorer la maintenabilité** du code POS

## 📁 Structure Proposée

```
components/
  └── pos/
      ├── checkout-modal-types.ts  ✅ (Créé)
      ├── CheckoutModal.tsx        📝 (À créer)
      ├── SelectTypeStep.tsx       📝 (Optionnel - Étape 0)
      ├── ClientInfoStep.tsx       📝 (Optionnel - Étape 1 CLIENT)
      ├── DriverSelectStep.tsx     📝 (Optionnel - Étape 1 DRIVER)
      ├── DeliveryInfoStep.tsx     📝 (Optionnel - Étape 2)
      └── PaymentStep.tsx          📝 (Optionnel - Étape 3)
```

## 🔄 Migration Progressive

### Étape 1 : Modifier la sélection des livreurs (IMMÉDIAT)

Remplacer l'interface actuelle des cartes de livreurs par un `Select` dans le fichier POS.

### Étape 2 : Créer le composant `CheckoutModal` (RECOMMANDÉ)

Extraire tout le contenu du modal dans `components/pos/CheckoutModal.tsx`.

### Étape 3 : Sous-composants optionnels (BONUS)

Si besoin de plus de modularité, créer des sous-composants pour chaque étape.

## 🚀 Changement Immédiat : Select pour Livreurs

Au lieu des cartes cliquables, utiliser un `Select` shadcn/ui :

```tsx
{/* AVANT : Boutons cards */}
{deliveryPersons.map((driver) => (
  <button onClick={() => setSelectedDeliveryPerson(driver.id)}>
    {/* Card complexe */}
  </button>
))}

{/* APRÈS : Select simple */}
<Select
  value={selectedDeliveryPerson}
  onValueChange={setSelectedDeliveryPerson}
>
  <SelectTrigger>
    <SelectValue placeholder="Choisir un livreur" />
  </SelectTrigger>
  <SelectContent>
    {deliveryPersons
      .filter(d => d.status === "AVAILABLE" || d.status === "BUSY")
      .map((driver) => (
        <SelectItem key={driver.id} value={driver.id}>
          <div className="flex items-center gap-2">
            <span>{driver.name}</span>
            <Badge variant={driver.status === "AVAILABLE" ? "default" : "secondary"}>
              {driver.status === "AVAILABLE" ? "Disponible" : "Occupé"}
            </Badge>
          </div>
        </SelectItem>
      ))}
  </SelectContent>
</Select>
```

## 📝 Utilisation du Composant CheckoutModal (Futur)

```tsx
// Dans page.tsx
import { CheckoutModal } from "@/components/pos/CheckoutModal"

export default function PosPage() {
  // ... états du panier

  return (
    <>
      {/* Bouton valider */}
      <Button onClick={() => setIsCheckoutOpen(true)}>
        Valider la commande
      </Button>

      {/* Modal séparé */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        cart={cart}
        storeId={storeId}
        contacts={contacts}
        deliveryPersons={deliveryPersons}
        deliveryZones={deliveryZones}
        onOrderCreated={() => {
          clearCart()
          loadProducts()
        }}
      />
    </>
  )
}
```

## ✅ Avantages

1. **Séparation des responsabilités** : POS = produits, Modal = checkout
2. **Réutilisabilité** : Le modal peut être utilisé ailleurs si nécessaire
3. **Testabilité** : Plus facile de tester le modal séparément
4. **Lisibilité** : Fichier POS plus court et plus clair
5. **Maintenabilité** : Modifications du checkout isolées

## 🎯 Prochaine Action Recommandée

**Option A** : Modifier uniquement la sélection des livreurs (rapide, immédiat)
**Option B** : Extraire tout le modal en composant (mieux long terme)

Je recommande **Option A** maintenant, puis **Option B** plus tard.
