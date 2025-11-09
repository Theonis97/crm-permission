# Guide d'utilisation de SWR pour les Ventes

## 📦 **Hook `useSales()`**

Ce hook utilise **SWR** (stale-while-revalidate) pour gérer les données des ventes de manière optimale.

### **Avantages**

✅ **Pas de rechargement manuel** - Les données se mettent à jour automatiquement  
✅ **Cache intelligent** - Les données sont mises en cache et réutilisées  
✅ **Revalidation automatique** - Mise à jour quand l'onglet reprend le focus  
✅ **Mutations optimistes** - L'UI se met à jour immédiatement  
✅ **Refresh périodique** - Toutes les 30 secondes  

## 🔧 **Utilisation**

### **Importer le hook**

```typescript
import { useSales } from "@/hooks/use-sales"
```

### **Utiliser dans un composant**

```typescript
const {
  // Données
  quotes,          // Liste des devis
  invoices,        // Liste des factures
  stats,           // Statistiques
  
  // États de chargement
  isLoading,       // Chargement global
  quotesLoading,   // Chargement des devis
  invoicesLoading, // Chargement des factures
  statsLoading,    // Chargement des stats
  
  // Actions avec mutations automatiques
  createQuote,     // Créer un devis
  createInvoice,   // Créer une facture
  deleteQuote,     // Supprimer un devis
  deleteInvoice,   // Supprimer une facture
  sendQuote,       // Envoyer un devis
  sendInvoice,     // Envoyer une facture
  
  // Mutations manuelles (si nécessaire)
  mutateQuotes,
  mutateInvoices,
  mutateStats,
} = useSales()
```

## 📝 **Exemples**

### **Afficher les statistiques**

```typescript
<SalesHeader stats={stats} loading={isLoading} />
```

### **Supprimer un devis**

```typescript
const handleDelete = async (quoteId: string) => {
  const result = await deleteQuote(quoteId)
  
  if (result.success) {
    toast.success(result.message)
    // ✅ SWR met à jour automatiquement les listes et stats
  }
}
```

### **Envoyer une facture**

```typescript
const handleSend = async (invoiceId: string) => {
  const result = await sendInvoice(invoiceId)
  
  if (result.success) {
    toast.success(result.message)
    // ✅ SWR revalide automatiquement
  }
}
```

## 🔄 **Système de mise à jour**

### **1. Événements personnalisés**

Quand un devis ou facture est créé, un événement est dispatché :

```typescript
window.dispatchEvent(new Event('quote-created'))
window.dispatchEvent(new Event('invoice-created'))
```

### **2. Écoute automatique**

Le hook `useSales()` écoute ces événements et revalide automatiquement :

```typescript
useEffect(() => {
  const handleQuoteCreated = () => {
    mutateQuotes()  // Recharge les devis
    mutateStats()   // Recharge les stats
  }
  
  window.addEventListener('quote-created', handleQuoteCreated)
  
  return () => {
    window.removeEventListener('quote-created', handleQuoteCreated)
  }
}, [mutateQuotes, mutateStats])
```

### **3. Refresh périodique**

Les données sont automatiquement rechargées toutes les 30 secondes :

```typescript
useSWR('/api/sales/quotes', fetcher, {
  refreshInterval: 30000, // 30 secondes
})
```

### **4. Revalidation au focus**

Quand l'utilisateur revient sur l'onglet, SWR recharge les données :

```typescript
revalidateOnFocus: true
```

## 🎯 **Flux de données**

```
1. Utilisateur crée un devis
   ↓
2. API POST /api/sales/quotes
   ↓
3. Event 'quote-created' dispatché
   ↓
4. Hook useSales() reçoit l'événement
   ↓
5. mutateQuotes() appelé automatiquement
   ↓
6. SWR recharge les données depuis l'API
   ↓
7. UI mise à jour automatiquement
```

## ⚡ **Pas besoin de :**

❌ Appeler `fetchStats()` manuellement  
❌ Recharger la page  
❌ Gérer les états de chargement manuellement  
❌ Synchroniser plusieurs états  

## ✅ **SWR gère automatiquement :**

✅ Cache des données  
✅ Revalidation  
✅ Dé-duplication des requêtes  
✅ États de chargement  
✅ Gestion des erreurs  
✅ Polling automatique  

## 📊 **Performance**

- **Premier chargement** : Données depuis l'API
- **Navigations suivantes** : Données depuis le cache
- **En arrière-plan** : Revalidation automatique
- **Mises à jour** : Instantanées avec mutations optimistes

## 🔗 **Documentation SWR**

Pour en savoir plus : https://swr.vercel.app/
