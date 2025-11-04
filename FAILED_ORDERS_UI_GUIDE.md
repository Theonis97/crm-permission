# 🎨 Interface de gestion des commandes WhatsApp échouées

## 📋 Vue d'ensemble

Interface complète pour gérer les commandes WhatsApp qui ont échoué à cause de **produits non trouvés** dans le catalogue. L'admin peut les visualiser, les corriger et les soumettre à nouveau.

## 🗺️ Accès à l'interface

### Localisation
**Dashboard → Delivery Map → Bouton "Erreurs WhatsApp"**

Le bouton n'apparaît que s'il y a **au moins 1 commande échouée** en attente.

### Indicateur visuel
```tsx
<Button variant="outline" className="border-orange-500 text-orange-600">
  <AlertTriangle /> Erreurs WhatsApp
  <Badge variant="destructive">{count}</Badge>
</Button>
```

- 🟠 **Bouton orange** : Attire l'attention
- 🔴 **Badge rouge** : Nombre de commandes en attente
- ⚠️ **Icône alerte** : Urgence visuelle

## 🎯 Fonctionnalités du Sheet

### 1. Liste des commandes échouées

Affichage automatique de toutes les commandes avec statut `PENDING` :

**Informations affichées :**
- ✅ Nom du client
- ✅ Téléphone
- ✅ Adresse de livraison
- ✅ Montant total
- ✅ **Liste des produits manquants** (badges)
- ✅ Date de réception
- ✅ Actions disponibles

**Exemple visuel :**
```
┌─────────────────────────────────────┐
│ Amissa                    [2 produit(s)] │
│ 066975825                               │
│ Owendo Seeg                            │
│                                         │
│ Produits manquants:                    │
│ [Parfum Yara] [Crème XYZ]              │
│                                         │
│ Total: 9,000 FCFA                      │
│ Reçue le: 04/11/2025 02:00            │
│                                         │
│ [Corriger]  [Rejeter]                  │
└─────────────────────────────────────┘
```

### 2. Mode édition / Correction

En cliquant sur **"Corriger"** :

#### Formulaire de correction
```tsx
Modifier la commande              [Annuler]

⚠️ Produits manquants: [Parfum Yara] [Crème XYZ]
────────────────────────────────────────────

📝 Nom du client
   [Amissa                    ]

📞 Téléphone
   [066975825                 ]

📍 Adresse de livraison
   [Owendo Seeg               ]

💰 Montant total (FCFA)
   [9000                      ]

📦 Produits                [+ Ajouter]
   [Parfum Yara       ] [2] [🗑️]
   [Crème D200        ] [1] [🗑️]

────────────────────────────────────────────
           [Créer la commande]
```

#### Capacités d'édition

1. **Corriger les noms de produits**
   - Remplacer "Parfum Yara" par "D200"
   - Ajouter le bon SKU ou nom

2. **Modifier les quantités**
   - Ajuster si nécessaire

3. **Ajouter/Supprimer des produits**
   - `+ Ajouter` : Nouveau produit
   - `🗑️` : Supprimer un produit

4. **Corriger les infos client**
   - Nom, téléphone, adresse, montant

### 3. Soumission de la commande corrigée

Quand l'admin clique sur **"Créer la commande"** :

```
1. Appel API POST /api/orders/from-whatsapp
   ↓
2. Validation des produits
   ↓
3. Création de la commande
   ↓
4. Mise à jour failed_whatsapp_order
   - status: "RESOLVED"
   - resolvedOrderId: "order_xxx"
   - resolvedAt: Date actuelle
   ↓
5. Toast de confirmation
   ✅ "Commande WA-2025-000123 créée avec succès!"
   ↓
6. Rafraîchissement automatique
   - Liste des commandes échouées
   - Carte de livraison
```

### 4. Rejet d'une commande

Si la commande n'est pas valide, l'admin peut la **rejeter** :

```
Clic sur [Rejeter]
   ↓
PATCH /api/orders/failed-whatsapp?id=xxx
   ↓
{
  status: "REJECTED",
  resolutionNotes: "Commande rejetée par l'admin"
}
   ↓
Toast: "Commande rejetée"
   ↓
Suppression de la liste PENDING
```

## 🔄 Auto-refresh

- **Commandes échouées** : Refresh toutes les **30 secondes**
- **Après résolution** : Rafraîchissement immédiat
- **Manuel** : Bouton refresh dans le header du sheet

## 📊 Workflow complet

### Scénario 1 : Nouveau produit demandé

```
1. Bot reçoit: "2 Parfum Yara"
   ↓
2. API cherche "Parfum Yara" → ❌ Non trouvé
   ↓
3. Enregistré dans failed_whatsapp_orders
   ↓
4. Badge apparaît sur Delivery Map: "Erreurs WhatsApp [1]"
   ↓
5. Admin clique → Sheet s'ouvre
   ↓
6. Admin voit la demande de "Parfum Yara"
   ↓
7. Admin va dans le catalogue → Ajoute "Parfum Yara"
   ↓
8. Admin retourne au sheet → Clic "Corriger"
   ↓
9. Vérifie les données → Clic "Créer la commande"
   ↓
10. ✅ Commande créée avec le nouveau produit
    ↓
11. Failed order marquée RESOLVED
```

### Scénario 2 : Erreur de frappe

```
1. Bot reçoit: "2 Parfume Yara" (faute)
   ↓
2. Produit non trouvé → Failed order
   ↓
3. Admin ouvre le sheet
   ↓
4. Admin clique "Corriger"
   ↓
5. Admin corrige: "Parfume Yara" → "Parfum Yara"
   ↓
6. Clic "Créer la commande"
   ↓
7. ✅ Commande créée avec le bon produit
```

### Scénario 3 : Commande invalide

```
1. Message incomplet/erroné reçu
   ↓
2. Failed order créée
   ↓
3. Admin examine → Impossible à corriger
   ↓
4. Admin clique "Rejeter"
   ↓
5. ✅ Commande marquée REJECTED
   ↓
6. Disparaît de la liste PENDING
```

## 🎨 États visuels

### Badge de compteur

| Nombre | Couleur | Urgence |
|--------|---------|---------|
| 0 | Caché | - |
| 1-5 | 🔴 Rouge | Normale |
| 6-10 | 🔴 Rouge | Moyenne |
| 11+ | 🔴 Rouge | Élevée |

### Statuts des commandes

| Statut | Badge | Affichage |
|--------|-------|-----------|
| PENDING | 🟠 Orange | Liste principale |
| RESOLVED | 🟢 Vert | Archive uniquement |
| REJECTED | 🔴 Rouge | Archive uniquement |

### Messages toast

```tsx
// Succès
✅ "Commande WA-2025-000123 créée avec succès!"

// Erreur de produit encore manquant
❌ "Produit(s) non trouvé(s): Parfum Yara"

// Rejet
✅ "Commande rejetée"

// Erreur réseau
❌ "Erreur lors de la création de la commande"
```

## 🔧 Configuration technique

### Composant principal
**Fichier** : `/components/delivery/failed-orders-sheet.tsx`

**Props** :
```typescript
interface FailedOrdersSheetProps {
  open: boolean                  // État ouverture
  onOpenChange: (open) => void  // Callback fermeture
  onOrderResolved?: () => void  // Callback après résolution
}
```

### APIs utilisées

1. **GET `/api/orders/failed-whatsapp?status=PENDING`**
   - Récupère liste des commandes échouées
   - Response: `{ success: true, data: [], count: number }`

2. **POST `/api/orders/from-whatsapp`**
   - Crée la commande corrigée
   - Headers: `Authorization: Bearer xxx`
   - Body: données complètes de la commande

3. **PATCH `/api/orders/failed-whatsapp?id=xxx`**
   - Met à jour le statut (RESOLVED/REJECTED)
   - Body: `{ status, resolvedOrderId, resolutionNotes }`

### Intégration dans Delivery Map

```tsx
// State
const [isFailedOrdersOpen, setIsFailedOrdersOpen] = useState(false)

// SWR pour le compteur
const { data: failedOrdersData } = useSWR(
  '/api/orders/failed-whatsapp?status=PENDING',
  fetcher,
  { refreshInterval: 30000 }
)

// Bouton conditionnel
{failedOrdersCount > 0 && (
  <Button onClick={() => setIsFailedOrdersOpen(true)}>
    <AlertTriangle /> Erreurs WhatsApp
    <Badge>{failedOrdersCount}</Badge>
  </Button>
)}

// Sheet
<FailedOrdersSheet
  open={isFailedOrdersOpen}
  onOpenChange={setIsFailedOrdersOpen}
  onOrderResolved={() => mutate()}
/>
```

## 📈 Métriques et monitoring

### Informations trackées
- ✅ Nombre de commandes échouées
- ✅ Taux de résolution
- ✅ Temps moyen de traitement
- ✅ Produits les plus demandés mais manquants

### Queries SQL utiles

```sql
-- Top produits demandés mais non trouvés
SELECT 
  jsonb_array_elements_text(missing_products) as product,
  COUNT(*) as requests
FROM failed_whatsapp_orders
WHERE status = 'PENDING'
GROUP BY product
ORDER BY requests DESC
LIMIT 10;

-- Taux de résolution par jour
SELECT 
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved,
  COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
  COUNT(*) FILTER (WHERE status = 'PENDING') as pending
FROM failed_whatsapp_orders
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## ✅ Checklist déploiement

- [x] Table `failed_whatsapp_orders` créée
- [x] Migration exécutée
- [x] API GET `/failed-whatsapp` fonctionnelle
- [x] API PATCH `/failed-whatsapp` fonctionnelle
- [x] Route `/from-whatsapp` enregistre les erreurs
- [x] Composant `FailedOrdersSheet` créé
- [x] Intégré dans Delivery Map
- [x] Badge avec compteur affiché
- [x] Auto-refresh configuré
- [x] Tests de bout en bout

## 🚀 Améliorations futures

### Court terme
- 📧 Email de notification aux admins
- 📊 Dashboard des statistiques d'erreurs
- 🔔 Son d'alerte pour nouvelles erreurs

### Moyen terme
- 🤖 Suggestions automatiques de produits similaires
- 📝 Templates de correction rapide
- 🔍 Recherche et filtrage avancés

### Long terme
- 📈 Analytics prédictifs
- 🧠 ML pour détection automatique de correspondances
- 💬 Chat intégré avec le vendeur WhatsApp
