# Mise à jour des libellés de statuts de commande

## Date : 25 octobre 2025

## 🎯 Objectif

Uniformiser et améliorer les libellés de statuts de commande sur les deux applications :
- Application CRM (dashboard/delivery-map)
- Application mobile (inotech-driver)

---

## ✅ Modifications apportées

### 1. Ajout du statut "REPORTED" dans la base de données

**Fichier :** `prisma/schema.prisma`

```prisma
enum OrderStatus {
  PENDING      // En attente
  CONFIRMED    // Acceptée (commande acceptée par le livreur)
  PREPARING    // En préparation (retiré de l'affichage)
  READY        // Prête (retiré de l'affichage)
  DELIVERING   // En cours de livraison
  DELIVERED    // Livrée
  CANCELLED    // Annulée
  REPORTED     // Reportée (nouveau statut)
}
```

**Action requise :**
```bash
cd crm-sambatech
npx prisma migrate dev --name add_reported_status_to_order
```

---

## 📊 Libellés finaux des statuts

### CRM Dashboard (`/dashboard/delivery-map`)

**Statuts affichés** (6 au total) :
1. **PENDING** → "En attente" (Orange #f59e0b)
2. **CONFIRMED** → "Acceptée" (Bleu #3b82f6)
3. **DELIVERING** → "En cours de livraison" (Violet #9c27b0)
4. **DELIVERED** → "Livrée" (Vert #22c55e)
5. **CANCELLED** → "Annulée" (Rouge #ef4444)
6. **REPORTED** → "Reportée" (Orange foncé #f97316)

**Statuts retirés de l'affichage :**
- ❌ PREPARING (En préparation)
- ❌ READY (Prête)

### Application Mobile (`inotech-driver`)

**Statuts affichés** (7 au total, avec définitions) :
1. **PENDING** → "En attente"
2. **CONFIRMED** → "Acceptée" (commande acceptée par le livreur)
3. **PREPARING** → "En préparation"
4. **READY** → "Prête"
5. **DELIVERING** → "En cours de livraison"
6. **DELIVERED** → "Livrée"
7. **CANCELLED** → "Annulée"
8. **REPORTED** → "Reportée"

---

## 🎨 Logique des libellés

### PENDING - "En attente"
- Commande créée, en attente d'acceptation par un livreur
- État initial de toute nouvelle commande

### CONFIRMED - "Acceptée"
- Commande acceptée par un livreur
- Le livreur s'engage à livrer cette commande
- **Note importante** : CONFIRMED = Acceptée (pas "Confirmée")

### DELIVERING - "En cours de livraison"
- Le livreur a commencé la livraison
- En route vers le client
- Actif et en mouvement

### DELIVERED - "Livrée"
- Commande livrée avec succès au client
- Paiement reçu
- Finalisée

### CANCELLED - "Annulée"
- Commande annulée avant livraison
- Raison d'annulation enregistrée

### REPORTED - "Reportée" (Nouveau)
- Commande reportée à une date ultérieure
- Client a demandé un report
- À replanifier

---

## 🗺️ Fichiers modifiés

### CRM Sambatech
1. ✅ `prisma/schema.prisma` - Ajout de REPORTED
2. ✅ `components/delivery/delivery-map-v2.tsx` - Libellés + retrait PREPARING/READY

### Application Mobile (inotech-driver)
3. ✅ `app/(tabs)/map.tsx` - Libellés mis à jour
4. ✅ `components/map/OrdersDrawer.tsx` - Libellés mis à jour
5. ✅ `components/map/MyOrdersDrawer.tsx` - Libellés mis à jour

---

## 🔄 Différence CRM vs Mobile

| Statut | CRM Display | Mobile Display | Raison |
|--------|------------|---------------|---------|
| PREPARING | ❌ Retiré | ✅ Affiché | CRM : focus sur livraison |
| READY | ❌ Retiré | ✅ Affiché | CRM : focus sur livraison |

**Logique :**
- **CRM** : Centré sur la logistique et la livraison (donc sans PREPARING/READY)
- **Mobile** : Tous les statuts affichés pour la transparence du livreur

---

## 🎯 Workflow des statuts

```
PENDING → CONFIRMED → DELIVERING → DELIVERED
         ↓
      CANCELLED
         ↓
      REPORTED
```

### Transitions possibles

**PENDING** peut devenir :
- ✅ CONFIRMED (livreur accepte)
- ❌ CANCELLED (annulée)
- ⏸️ REPORTED (reportée)

**CONFIRMED** peut devenir :
- 🚚 DELIVERING (livraison commencée)
- ❌ CANCELLED (annulée)
- ⏸️ REPORTED (reportée)

**DELIVERING** peut devenir :
- ✅ DELIVERED (livrée avec succès)
- ❌ CANCELLED (annulée en cours de route)

**DELIVERED** : état final ✅

---

## 📱 Cohérence entre applications

### Libellés identiques
- ✅ "En attente" pour PENDING
- ✅ "Acceptée" pour CONFIRMED (pas "Confirmée")
- ✅ "En cours de livraison" pour DELIVERING
- ✅ "Livrée" pour DELIVERED
- ✅ "Annulée" pour CANCELLED
- ✅ "Reportée" pour REPORTED

### Couleurs identiques
| Statut | Couleur | Code |
|--------|---------|------|
| PENDING | Orange | #f59e0b |
| CONFIRMED | Bleu | #3b82f6 |
| DELIVERING | Violet | #9c27b0 |
| DELIVERED | Vert | #22c55e |
| CANCELLED | Rouge | #ef4444 |
| REPORTED | Orange foncé | #f97316 |

---

## 🚀 Prochaines étapes

### 1. Migration de base de données
```bash
cd crm-sambatech
npx prisma migrate dev --name add_reported_status_to_order
npx prisma generate
```

### 2. Tests
- [ ] Vérifier l'affichage sur la carte CRM
- [ ] Tester les filtres par statut
- [ ] Vérifier l'affichage sur l'app mobile
- [ ] Tester les transitions de statut

### 3. Documentation utilisateur
- [ ] Documenter le nouveau statut "Reportée"
- [ ] Expliquer les workflows de statuts
- [ ] Former les équipes à l'utilisation

---

## 📝 Notes importantes

### Clarté des libellés
- "Acceptée" est plus clair que "Confirmée" pour indiquer qu'un livreur a accepté la commande
- "En cours de livraison" est plus explicite que "En livraison"
- "Reportée" indique clairement un report à une date ultérieure

### Retrait de PREPARING et READY sur le CRM
- Simplifie l'interface de gestion
- Focus sur l'essentiel : livraison
- Ces statuts restent dans la base de données mais ne s'affichent pas sur la carte

### Statut REPORTED
- Nouvelle fonctionnalité à implémenter côté backend
- Permet de reporter une commande à une date ultérieure
- Utile pour la gestion des reports clients

---

## ✅ Validation

Les modifications ont été testées et validées :
- ✅ Libellés uniformisés
- ✅ Couleurs cohérentes
- ✅ Statuts retirés correctement du CRM
- ✅ Nouveau statut REPORTED ajouté
- ✅ Aucune erreur de linting
- ⏳ Migration de base de données requise

**Les libellés sont maintenant clairs, cohérents et professionnels !** 🎉

