# Documentation Module Paie & Sécurité des Modules

## Résumé Global

Ce document décrit les fonctionnalités implémentées pour le **module Paie** et le **système de double authentification** pour sécuriser l'accès aux modules sensibles (Paie et Comptabilité).

---

## 1. Module Paie - Fonctionnalités

### 1.1 Gestion des Périodes de Paie

| Fonctionnalité | Description |
|----------------|-------------|
| Création de période | Créer une nouvelle période de paie (mois/année) |
| Génération des bulletins | Générer automatiquement les bulletins pour tous les employés actifs |
| Clôture de période | Clôturer une période pour empêcher les modifications |
| Suppression de période | Supprimer une période complète avec tous ses bulletins |

### 1.2 Gestion des Bulletins de Paie

| Fonctionnalité | Description |
|----------------|-------------|
| Création manuelle | Créer un bulletin pour un employé spécifique |
| Modification | Modifier les éléments d'un bulletin (ajustements, primes, etc.) |
| Validation RH | Valider un bulletin par les Ressources Humaines |
| Approbation Direction | Approuver un bulletin par la Direction |
| Paiement | Marquer un bulletin comme payé |
| Impression | Générer un PDF du bulletin de paie |

### 1.3 Gestion des Profils Employés

| Fonctionnalité | Description |
|----------------|-------------|
| Création de profil | Créer un profil de paie pour un employé |
| Modification | Modifier les informations de paie (salaire de base, avantages, etc.) |
| Consultation | Voir les détails d'un profil employé |

### 1.4 Gestion des Cotisations

| Fonctionnalité | Description |
|----------------|-------------|
| Liste des cotisations | CNSS, CNAMGS, ITS, etc. |
| Création | Ajouter une nouvelle cotisation |
| Modification | Modifier les taux et paramètres |
| Activation/Désactivation | Activer ou désactiver une cotisation |

### 1.5 Workflow des Bulletins

```
DRAFT → VALIDATED → APPROVED → PAID
  ↓         ↓           ↓
(Brouillon) (Validé RH) (Approuvé Direction) → (Payé)
```

---

## 2. Système de Double Authentification (2FA)

### 2.1 Principe de Fonctionnement

Les modules sensibles (Paie et Comptabilité) sont protégés par une double authentification :

1. **L'utilisateur demande un code d'accès**
2. **Un code à 6 chiffres est envoyé par email** à l'administrateur configuré
3. **L'utilisateur saisit le code** reçu de l'administrateur
4. **Accès accordé** si le code est valide et non expiré

### 2.2 Caractéristiques du Code

| Paramètre | Valeur |
|-----------|--------|
| Longueur | 6 chiffres |
| Validité | 10 minutes |
| Usage unique | Oui |
| Invalidation | Les anciens codes sont invalidés à chaque nouvelle demande |

### 2.3 Configuration de l'Email de Réception

Chaque module a sa propre configuration d'email de réception :

| Module | Page de configuration | Email par défaut |
|--------|----------------------|------------------|
| Paie | `/dashboard/payroll/settings` | gabinmoundziegou@gmail.com |
| Comptabilité | `/dashboard/accounting/settings` | gabinmoundziegou@gmail.com |

**Important** : La configuration de l'email est accessible **uniquement après avoir accédé au module** (pas sur l'écran de vérification), ce qui empêche toute modification non autorisée.

---

## 3. Modèles Prisma Créés

### 3.1 PayrollAccessCode

```prisma
model PayrollAccessCode {
  id          String   @id @default(cuid())
  userId      String   @map("user_id")
  code        String   // Code à 6 chiffres
  expiresAt   DateTime @map("expires_at")
  isUsed      Boolean  @default(false) @map("is_used")
  createdAt   DateTime @default(now()) @map("created_at")

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([code])
  @@map("payroll_access_codes")
}
```

### 3.2 ModuleAccessConfig

```prisma
model ModuleAccessConfig {
  id              String       @id @default(cuid())
  module          SecureModule @unique
  recipientEmail  String       @map("recipient_email")
  updatedById     String       @map("updated_by_id")
  updatedAt       DateTime     @updatedAt @map("updated_at")
  createdAt       DateTime     @default(now()) @map("created_at")

  updatedBy       User         @relation(fields: [updatedById], references: [id])

  @@map("module_access_configs")
}

enum SecureModule {
  ACCOUNTING
  PAYROLL
}
```

---

## 4. Permissions Créées

### 4.1 Liste des Permissions du Module Paie

| Permission | Description |
|------------|-------------|
| `payroll.view` | Voir le module paie et les bulletins |
| `payroll.create` | Créer des bulletins de paie |
| `payroll.edit` | Modifier les bulletins de paie |
| `payroll.delete` | Supprimer les bulletins de paie |
| `payroll.validate` | Valider les bulletins (RH) |
| `payroll.approve` | Approuver les bulletins (Direction) |
| `payroll.pay` | Marquer les bulletins comme payés |
| `payroll.profiles.view` | Voir les profils employés |
| `payroll.profiles.manage` | Gérer les profils employés |
| `payroll.contributions.view` | Voir les cotisations |
| `payroll.contributions.manage` | Gérer les cotisations |
| `payroll.adjustments.view` | Voir les ajustements |
| `payroll.adjustments.manage` | Gérer les ajustements |
| `payroll.periods.view` | Voir les périodes de paie |
| `payroll.periods.manage` | Gérer les périodes de paie |
| `payroll.reports` | Accès aux rapports de paie |

### 4.2 Attribution des Permissions aux Rôles

| Rôle | Permissions attribuées |
|------|------------------------|
| **Super Admin** | Toutes les permissions |
| **Admin** | Toutes les permissions |

---

## 5. APIs Créées

### 5.1 APIs de Double Authentification - Module Paie

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/payroll/access/request-code` | POST | Demander un code d'accès |
| `/api/payroll/access/verify-code` | POST | Vérifier un code d'accès |
| `/api/payroll/access/config` | GET | Récupérer la configuration email |
| `/api/payroll/access/config` | PUT | Modifier l'email de réception |

### 5.2 APIs de Double Authentification - Module Comptabilité

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/accounting/access/request-code` | POST | Demander un code d'accès |
| `/api/accounting/access/verify-code` | POST | Vérifier un code d'accès |
| `/api/accounting/access/config` | GET | Récupérer la configuration email |
| `/api/accounting/access/config` | PUT | Modifier l'email de réception |

### 5.3 Permissions pour Modifier la Configuration Email

| Module | Permissions autorisées |
|--------|------------------------|
| **Paie** | `payroll.contributions.manage`, `payroll.periods.manage`, `payroll.profiles.manage`, `admin` |
| **Comptabilité** | `accounting.expenses.manage`, `accounting.revenues.manage`, `accounting.categories.manage`, `admin` |

---

## 6. Composants React Créés

### 6.1 Guards de Protection

| Composant | Fichier | Description |
|-----------|---------|-------------|
| `PayrollAccessGuard` | `/components/payroll/payroll-access-guard.tsx` | Protège le module Paie |
| `AccountingAccessGuard` | `/components/accounting/accounting-access-guard.tsx` | Protège le module Comptabilité |

### 6.2 Pages de Paramètres

| Page | Fichier | Description |
|------|---------|-------------|
| Paramètres Paie | `/app/dashboard/payroll/settings/page.tsx` | Configuration email du module Paie |
| Paramètres Comptabilité | `/app/dashboard/accounting/settings/page.tsx` | Configuration email du module Comptabilité |

### 6.3 Intégration dans les Layouts

Les guards sont intégrés dans les layouts des modules :

```tsx
// /app/dashboard/payroll/layout.tsx
<PayrollAccessGuard>
  {children}
</PayrollAccessGuard>

// /app/dashboard/accounting/layout.tsx
<AccountingAccessGuard>
  {children}
</AccountingAccessGuard>
```

---

## 7. Sidebars Modifiées

### 7.1 Sidebar Paie (`/components/payroll/payroll-sidebar.tsx`)

Menu ajouté :
- Vue d'ensemble
- Profils employés
- Périodes de paie
- Cotisations
- **Paramètres** ← Nouveau

### 7.2 Sidebar Comptabilité (`/components/accounting/accounting-sidebar.tsx`)

Menu ajouté :
- Rapport
- Recettes
- Dépenses
- Catégories
- **Paramètres** ← Nouveau

---

## 8. Flux de Sécurité

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCÈS AU MODULE PAIE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Utilisateur accède à /dashboard/payroll                     │
│                    ↓                                            │
│  2. PayrollAccessGuard vérifie si accès validé                  │
│                    ↓                                            │
│  3. Si NON → Affiche écran de vérification                      │
│              └→ Bouton "Demander un code d'accès"               │
│                    ↓                                            │
│  4. Code envoyé par email à l'administrateur configuré          │
│                    ↓                                            │
│  5. Utilisateur saisit le code reçu                             │
│                    ↓                                            │
│  6. Si code valide → Accès accordé au module                    │
│                    ↓                                            │
│  7. Menu "Paramètres" accessible pour configurer l'email        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Impression des Documents

### 9.1 Bon de Paiement (Dépenses)

**Fichier** : `/app/dashboard/accounting/expenses/[id]/print/page.tsx`

**Améliorations apportées** :
- Affichage correct du logo de la boutique assignée
- Pour les dépenses générales (sans boutique) : affichage de **"Intech Gabon"** avec le logo `/logo.jpeg`
- Gestion d'erreur si le logo ne charge pas

---

## 10. Migration Prisma

Pour appliquer les changements de schéma, exécutez :

```bash
npx prisma migrate dev --name add_payroll_access_and_module_config
npx prisma generate
```

---

## 11. Seed des Permissions

Pour créer les permissions du module Paie et les attribuer aux rôles :

```bash
npx ts-node prisma/seed-payroll-permissions.ts
```

---

## 12. Résumé des Fichiers Créés/Modifiés

### Fichiers Créés

| Fichier | Description |
|---------|-------------|
| `/app/api/payroll/access/request-code/route.ts` | API demande de code (Paie) |
| `/app/api/payroll/access/verify-code/route.ts` | API vérification de code (Paie) |
| `/app/api/payroll/access/config/route.ts` | API configuration email (Paie) |
| `/app/api/accounting/access/config/route.ts` | API configuration email (Comptabilité) |
| `/components/payroll/payroll-access-guard.tsx` | Guard de protection (Paie) |
| `/app/dashboard/payroll/settings/page.tsx` | Page paramètres (Paie) |
| `/app/dashboard/accounting/settings/page.tsx` | Page paramètres (Comptabilité) |
| `/prisma/seed-payroll-permissions.ts` | Script de seed des permissions |

### Fichiers Modifiés

| Fichier | Modification |
|---------|--------------|
| `/prisma/schema.prisma` | Ajout des modèles PayrollAccessCode et ModuleAccessConfig |
| `/app/dashboard/payroll/layout.tsx` | Intégration du PayrollAccessGuard |
| `/app/api/accounting/access/request-code/route.ts` | Utilisation de l'email configuré |
| `/components/accounting/accounting-access-guard.tsx` | Retrait du bouton de config de l'écran de vérification |
| `/components/payroll/payroll-sidebar.tsx` | Ajout du lien "Paramètres" |
| `/components/accounting/accounting-sidebar.tsx` | Ajout du lien "Paramètres" |
| `/app/dashboard/accounting/expenses/[id]/print/page.tsx` | Correction affichage logo et fallback Intech Gabon |

---

## 13. Notes Importantes

1. **Sécurité** : Le bouton de configuration de l'email n'est **jamais** affiché sur l'écran de vérification. Il est accessible uniquement après avoir validé l'accès au module.

2. **Fallback** : Si aucun email n'est configuré, l'email par défaut `gabinmoundziegou@gmail.com` est utilisé.

3. **Expiration** : Les codes d'accès expirent après **10 minutes**.

4. **Invalidation** : Chaque nouvelle demande de code invalide les codes précédents non utilisés.

5. **Permissions** : Seuls les utilisateurs avec les permissions appropriées peuvent modifier la configuration email.

---

*Document généré le 28 janvier 2026*
