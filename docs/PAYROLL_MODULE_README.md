# Module Paie - Documentation

## Vue d'ensemble

Le module Paie permet de gérer les salaires des employés en s'intégrant avec le système de pointage existant. Il supporte les employés déclarés (avec cotisations sociales) et non déclarés.

## Installation

### 1. Migration de la base de données

```bash
# Générer la migration
npx prisma migrate dev --name add_payroll_module

# Régénérer le client Prisma
npx prisma generate
```

### 2. Seed des cotisations par défaut

```bash
npx ts-node prisma/seed-payroll.ts
```

### 3. Ajouter les permissions

Ajouter les permissions suivantes dans la base de données :

```sql
INSERT INTO permissions (id, name, description) VALUES
  (gen_random_uuid(), 'payroll.view', 'Voir les bulletins de paie'),
  (gen_random_uuid(), 'payroll.create', 'Créer des bulletins de paie'),
  (gen_random_uuid(), 'payroll.edit', 'Modifier les bulletins de paie'),
  (gen_random_uuid(), 'payroll.validate', 'Valider les bulletins (RH)'),
  (gen_random_uuid(), 'payroll.approve', 'Approuver les bulletins (Direction)'),
  (gen_random_uuid(), 'payroll.pay', 'Marquer les bulletins comme payés'),
  (gen_random_uuid(), 'payroll.profiles.manage', 'Gérer les profils employés'),
  (gen_random_uuid(), 'payroll.contributions.manage', 'Gérer les cotisations'),
  (gen_random_uuid(), 'payroll.adjustments.manage', 'Gérer les ajustements'),
  (gen_random_uuid(), 'payroll.reports', 'Accès aux rapports de paie');
```

## Structure du module

### Modèles Prisma

| Modèle | Description |
|--------|-------------|
| `EmployeePayrollProfile` | Configuration salariale d'un employé |
| `PayrollContribution` | Cotisations et taxes configurables |
| `PayrollPeriod` | Période de paie (mois, quinzaine, semaine) |
| `Payroll` | Bulletin de paie individuel |
| `PayrollContributionLine` | Lignes de cotisations sur un bulletin |
| `PayrollAdjustment` | Primes, retenues, absences |
| `PayrollAuditLog` | Historique des modifications |

### APIs

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/payroll/profiles` | GET, POST | Liste et création des profils |
| `/api/payroll/profiles/[id]` | GET, PUT, DELETE | CRUD profil |
| `/api/payroll/contributions` | GET, POST | Gestion des cotisations |
| `/api/payroll/contributions/[id]` | GET, PUT, DELETE | CRUD cotisation |
| `/api/payroll/periods` | GET, POST | Gestion des périodes |
| `/api/payroll/periods/[id]` | GET, PUT | Détails et clôture période |
| `/api/payroll/periods/[id]/generate` | POST | Générer les bulletins |
| `/api/payroll/[id]` | GET, PUT | Détails et modification bulletin |
| `/api/payroll/[id]/validate` | POST | Validation RH |
| `/api/payroll/[id]/approve` | POST | Approbation direction |
| `/api/payroll/[id]/pay` | POST | Marquer comme payé |
| `/api/payroll/adjustments` | GET, POST | Gestion des ajustements |

### Pages UI

| Route | Description |
|-------|-------------|
| `/dashboard/payroll` | Dashboard principal |
| `/dashboard/payroll/profiles` | Liste des profils employés |
| `/dashboard/payroll/periods` | Liste des périodes |
| `/dashboard/payroll/periods/new` | Créer une période |
| `/dashboard/payroll/periods/[id]` | Détail période + bulletins |
| `/dashboard/payroll/contributions` | Configuration cotisations |

## Workflow de paie

```
1. CONFIGURER LES PROFILS
   └── Définir salaire, type de contrat, heures attendues

2. CRÉER UNE PÉRIODE
   └── Définir dates de début/fin, jours ouvrés

3. GÉNÉRER LES BULLETINS
   └── Calcul automatique depuis le pointage
   └── Application des cotisations (employés déclarés)
   └── Application des ajustements (primes, retenues)

4. VALIDER (RH)
   └── Vérification des données
   └── Ajustements manuels si nécessaire

5. APPROUVER (Direction)
   └── Validation finale

6. PAYER
   └── Marquer comme payé avec référence
```

## Types d'employés

### Déclaré (DECLARED)
- Cotisations sociales appliquées
- CNSS, IRPP, taxes communales
- Charges patronales calculées

### Non déclaré (UNDECLARED)
- Pas de cotisations
- Salaire brut = salaire net
- Pas de charges patronales

## Types de contrat

| Type | Calcul du salaire |
|------|-------------------|
| MONTHLY | Salaire mensuel proratisé aux jours travaillés |
| DAILY | Taux journalier × jours travaillés |
| HOURLY | Taux horaire × heures travaillées + heures sup |
| CONTRACTOR | Montant fixe ou taux journalier |
| TEMPORARY | Idem CONTRACTOR |

## Cotisations par défaut

### Part salariale
- CNSS Salariale : 2.5%
- IRPP : 5%
- Taxe Communale : 1%

### Part patronale
- CNSS Patronale : 16%
- Taxe d'Apprentissage : 1.2%
- Contribution Formation : 0.5%

## Intégration avec le pointage

Le module utilise les données de pointage existantes :
- `AttendanceLog` pour les heures travaillées
- Calcul automatique des jours et heures
- Distinction entre pointage automatique et manuel

## Ajustements

Types d'ajustements disponibles :
- **BONUS** : Prime (montant positif)
- **DEDUCTION** : Retenue (montant négatif)
- **OVERTIME** : Heures supplémentaires
- **ABSENCE** : Jours/heures d'absence
- **ADVANCE** : Avance sur salaire
- **OTHER** : Autre

## Audit Trail

Toutes les modifications sont tracées :
- Création de bulletin
- Modifications de montants
- Validation RH
- Approbation Direction
- Paiement

## Fichiers créés

```
prisma/
├── schema.prisma (modifié - ajout des modèles Paie)
└── seed-payroll.ts (seed des cotisations)

lib/
└── payroll-calculator.ts (logique de calcul)

app/api/payroll/
├── profiles/
│   ├── route.ts
│   └── [id]/route.ts
├── contributions/
│   ├── route.ts
│   └── [id]/route.ts
├── periods/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── generate/route.ts
├── adjustments/route.ts
└── [id]/
    ├── route.ts
    ├── validate/route.ts
    ├── approve/route.ts
    └── pay/route.ts

app/dashboard/payroll/
├── page.tsx (dashboard)
├── profiles/page.tsx
├── periods/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/page.tsx
└── contributions/page.tsx
```

## Prochaines étapes

1. **Génération PDF** : Implémenter la génération de bulletins PDF
2. **Notifications** : Alertes pour validation/approbation
3. **Rapports** : KPIs et statistiques avancées
4. **Export** : Export Excel/CSV des données
5. **Archivage** : Archivage automatique des périodes clôturées
