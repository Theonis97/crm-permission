# Module Paie - Architecture Complète

> **Version**: 1.0  
> **Dernière mise à jour**: Janvier 2026  
> **Auteur**: Documentation technique

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Modèles de données](#2-modèles-de-données)
3. [Fonctionnalités](#3-fonctionnalités)
4. [API Endpoints](#4-api-endpoints)
5. [Workflows et Séquences](#5-workflows-et-séquences)
6. [Composants UI](#6-composants-ui)
7. [Calculs et Formules](#7-calculs-et-formules)
8. [Sécurité](#8-sécurité)
9. [Améliorations futures](#9-améliorations-futures)

---

## 1. Vue d'ensemble

### 1.1 Description

Le module de paie est un système complet de gestion des salaires permettant :
- La configuration des profils employés avec leurs paramètres de paie
- La gestion des cotisations sociales (CNSS, IRPP, etc.)
- La gestion des rubriques (primes et indemnités)
- La génération automatique des bulletins de paie basée sur le pointage
- Un workflow de validation multi-niveaux
- L'impression des bulletins de paie

### 1.2 Architecture technique

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Pages:                    │  Composants:                        │
│  - /dashboard/payroll      │  - PayrollSidebar                   │
│  - /payroll/profiles       │  - EditPayrollSheet                 │
│  - /payroll/periods        │  - CreateRubricSheet                │
│  - /payroll/contributions  │  - RubricEmployeesSheet             │
│  - /payroll/rubrics        │  - etc.                             │
│  - /payroll/settings       │                                     │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API ROUTES (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  /api/payroll/profiles     │  /api/payroll/rubrics               │
│  /api/payroll/periods      │  /api/payroll/contributions         │
│  /api/payroll/[id]         │  /api/payroll/print                 │
│  /api/payroll/access       │  /api/payroll/adjustments           │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BUSINESS LOGIC                                │
├─────────────────────────────────────────────────────────────────┤
│  lib/payroll-calculator.ts                                       │
│  - getAttendanceData()                                           │
│  - calculateWorkingDaysInPeriod()                                │
│  - calculateGrossSalary()                                        │
│  - calculateContributions()                                      │
│  - calculatePayroll()                                            │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL + Prisma)                │
├─────────────────────────────────────────────────────────────────┤
│  Tables principales:                                             │
│  - employee_payroll_profiles                                     │
│  - payroll_periods                                               │
│  - payrolls                                                      │
│  - payroll_contributions                                         │
│  - payroll_rubrics                                               │
│  - payroll_contribution_lines                                    │
│  - payroll_rubric_lines                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Modèles de données

### 2.1 EmployeePayrollProfile

Profil de paie d'un employé.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `userId` | String | Lien vers l'utilisateur |
| `employeeType` | Enum | DECLARED, UNDECLARED |
| `contractType` | Enum | CDI, CDD, STAGE, INTERIM, FREELANCE |
| `baseSalary` | Float | Salaire de base mensuel |
| `salaryIsNet` | Boolean | Si le salaire est net (défaut: false) |
| `workingDaysPattern` | String[] | Jours de travail (ex: ["MONDAY", "TUESDAY"...]) |
| `workingHoursPerDay` | Float | Heures par jour (défaut: 8) |
| `dailyRate` | Float? | Taux journalier (calculé) |
| `hourlyRate` | Float? | Taux horaire (calculé) |
| `overtimeRate` | Float | Majoration heures sup (défaut: 1.5) |
| `position` | String? | Poste occupé |
| `hireDate` | DateTime? | Date d'embauche |
| `bankName` | String? | Nom de la banque |
| `bankAccountNumber` | String? | Numéro de compte |
| `isActive` | Boolean | Profil actif |

**Relations:**
- `user` → User
- `payrolls` → Payroll[]
- `contributions` → EmployeeContribution[]
- `rubrics` → EmployeeRubric[]
- `adjustments` → PayrollAdjustment[]

---

### 2.2 PayrollPeriod

Période de paie (généralement mensuelle).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `name` | String | Nom de la période (ex: "Janvier 2026") |
| `periodType` | Enum | MONTHLY, BIWEEKLY, WEEKLY |
| `startDate` | DateTime | Date de début |
| `endDate` | DateTime | Date de fin |
| `workingDays` | Int | Nombre de jours ouvrés |
| `isClosed` | Boolean | Période clôturée |
| `closedAt` | DateTime? | Date de clôture |
| `closedById` | String? | Utilisateur qui a clôturé |

**Relations:**
- `payrolls` → Payroll[]
- `closedBy` → User?

---

### 2.3 Payroll

Bulletin de paie individuel.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `number` | String | Numéro unique (ex: BP-2026-01-001) |
| `employeeProfileId` | String | Profil employé |
| `periodId` | String | Période de paie |
| `daysWorked` | Float | Jours travaillés (après ajustements) |
| `hoursWorked` | Float | Heures travaillées (après ajustements) |
| `overtimeHours` | Float | Heures supplémentaires |
| `absenceDays` | Float | Jours d'absence |
| `rawDaysWorked` | Float | Jours bruts (pointage) |
| `rawHoursWorked` | Float | Heures brutes (pointage) |
| `expectedWorkingDays` | Float | Jours ouvrés attendus |
| `grossSalary` | Float | Salaire brut |
| `totalDeductions` | Float | Total cotisations salariales |
| `totalBonuses` | Float | Total primes/indemnités |
| `netSalary` | Float | Salaire net |
| `employerCharges` | Float | Charges patronales |
| `status` | Enum | DRAFT, PENDING, VALIDATED, APPROVED, PAID, CANCELLED |
| `validatedById` | String? | Validateur RH |
| `validatedAt` | DateTime? | Date validation |
| `approvedById` | String? | Approbateur Direction |
| `approvedAt` | DateTime? | Date approbation |
| `paidAt` | DateTime? | Date de paiement |
| `paymentReference` | String? | Référence paiement |

**Relations:**
- `employeeProfile` → EmployeePayrollProfile
- `period` → PayrollPeriod
- `contributionLines` → PayrollContributionLine[]
- `rubricLines` → PayrollRubricLine[]
- `adjustments` → PayrollAdjustment[]
- `auditLogs` → PayrollAuditLog[]

---

### 2.4 PayrollContribution

Configuration des cotisations sociales.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `name` | String | Nom (ex: "CNSS Salariale") |
| `code` | String | Code unique (ex: "CNSS_SAL") |
| `description` | String? | Description |
| `isEmployeeShare` | Boolean | Part salariale |
| `isEmployerShare` | Boolean | Part patronale |
| `rate` | Float | Taux en % |
| `ceiling` | Float? | Plafond de calcul |
| `declaredOnly` | Boolean | Uniquement employés déclarés |
| `displayOrder` | Int | Ordre d'affichage |
| `isActive` | Boolean | Cotisation active |

---

### 2.5 EmployeeContribution

Cotisations assignées à un employé.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `employeeProfileId` | String | Profil employé |
| `contributionId` | String | Cotisation |
| `customRate` | Float? | Taux personnalisé (surcharge) |
| `isActive` | Boolean | Assignation active |

---

### 2.6 PayrollContributionLine

Ligne de cotisation sur un bulletin.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `payrollId` | String | Bulletin |
| `contributionId` | String | Cotisation |
| `baseAmount` | Float | Base de calcul |
| `appliedRate` | Float | Taux appliqué |
| `amount` | Float | Montant calculé |

---

### 2.7 PayrollRubric

Catalogue des rubriques (primes et indemnités).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `code` | String | Code unique (ex: "PRIME_PERF") |
| `name` | String | Nom (ex: "Prime de performance") |
| `description` | String? | Description |
| `type` | Enum | PRIME, INDEMNITY |
| `isSubjectToTax` | Boolean | Imposable (IRPP) |
| `isSubjectToSocial` | Boolean | Soumis aux cotisations |
| `calculationBase` | Enum | FIXED, GROSS_SALARY, BASE_SALARY, NET_SALARY |
| `defaultAmount` | Float? | Montant par défaut |
| `defaultRate` | Float? | Taux par défaut (si %) |
| `exemptionCeiling` | Float? | Plafond d'exonération |
| `displayOrder` | Int | Ordre d'affichage |
| `category` | String? | Catégorie |
| `isActive` | Boolean | Rubrique active |

---

### 2.8 EmployeeRubric

Rubriques assignées à un employé.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `employeeProfileId` | String | Profil employé |
| `rubricId` | String | Rubrique |
| `amount` | Float? | Montant personnalisé |
| `rate` | Float? | Taux personnalisé |
| `startDate` | DateTime? | Date de début |
| `endDate` | DateTime? | Date de fin |
| `isActive` | Boolean | Assignation active |
| `createdById` | String | Créateur |
| `notes` | String? | Notes |

---

### 2.9 PayrollRubricLine

Ligne de rubrique sur un bulletin.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `payrollId` | String | Bulletin |
| `rubricId` | String | Rubrique |
| `rubricCode` | String | Code (snapshot) |
| `rubricName` | String | Nom (snapshot) |
| `rubricType` | Enum | PRIME, INDEMNITY |
| `baseAmount` | Float | Base de calcul |
| `rate` | Float? | Taux appliqué |
| `amount` | Float | Montant final |
| `isSubjectToTax` | Boolean | Imposable |
| `isSubjectToSocial` | Boolean | Soumis cotisations |
| `exemptAmount` | Float | Montant exonéré |
| `taxableAmount` | Float | Montant imposable |

---

### 2.10 PayrollAdjustment

Ajustements manuels (primes ponctuelles, retenues, absences).

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `employeeProfileId` | String? | Profil (si récurrent) |
| `payrollId` | String? | Bulletin (si ponctuel) |
| `type` | Enum | BONUS, DEDUCTION, ABSENCE, OVERTIME, ADVANCE, OTHER |
| `description` | String | Description |
| `amount` | Float | Montant |
| `daysAffected` | Float? | Jours impactés |
| `hoursAffected` | Float? | Heures impactées |
| `createdById` | String | Créateur |
| `reason` | String? | Motif |
| `isRecurring` | Boolean | Récurrent |

---

### 2.11 PayrollAuditLog

Historique des modifications.

| Champ | Type | Description |
|-------|------|-------------|
| `id` | String | Identifiant unique |
| `payrollId` | String | Bulletin |
| `userId` | String | Utilisateur |
| `action` | String | Action (UPDATE, VALIDATE, etc.) |
| `field` | String? | Champ modifié |
| `oldValue` | String? | Ancienne valeur |
| `newValue` | String? | Nouvelle valeur |
| `comment` | String? | Commentaire |

---

### 2.12 Diagramme des relations

```
┌─────────────────────┐
│        User         │
└──────────┬──────────┘
           │ 1:1
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│EmployeePayrollProfile│◄────│  EmployeeContribution│
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           │ 1:N                        │ N:1
           │                            ▼
           │                 ┌─────────────────────┐
           │                 │ PayrollContribution │
           │                 └─────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│      Payroll        │◄────►│   PayrollPeriod     │
└──────────┬──────────┘      └─────────────────────┘
           │
           │ 1:N
           ├──────────────────────────────────────┐
           │                                      │
           ▼                                      ▼
┌─────────────────────┐              ┌─────────────────────┐
│PayrollContributionLine│            │  PayrollRubricLine  │
└─────────────────────┘              └──────────┬──────────┘
                                                │ N:1
                                                ▼
                                     ┌─────────────────────┐
                                     │   PayrollRubric     │
                                     └─────────────────────┘
```

---

## 3. Fonctionnalités

### 3.1 Gestion des profils employés

| Fonctionnalité | Description |
|----------------|-------------|
| Créer un profil | Configurer les paramètres de paie d'un employé |
| Modifier un profil | Mettre à jour salaire, contrat, jours de travail |
| Assigner des cotisations | Lier des cotisations à un employé |
| Assigner des rubriques | Lier des primes/indemnités récurrentes |
| Désactiver un profil | Exclure un employé de la génération de paie |

### 3.2 Gestion des périodes de paie

| Fonctionnalité | Description |
|----------------|-------------|
| Créer une période | Définir une nouvelle période de paie |
| Générer les bulletins | Créer automatiquement les bulletins pour tous les employés actifs |
| Clôturer une période | Verrouiller la période après paiement |

### 3.3 Gestion des bulletins

| Fonctionnalité | Description |
|----------------|-------------|
| Consulter un bulletin | Voir les détails d'un bulletin |
| Modifier un bulletin | Ajuster heures, salaire brut, primes |
| Ajouter des rubriques | Ajouter des primes/indemnités ponctuelles |
| Valider (RH) | Première validation par les RH |
| Approuver (Direction) | Approbation finale par la direction |
| Marquer comme payé | Enregistrer le paiement |
| Imprimer | Générer le PDF du bulletin |

### 3.4 Gestion des cotisations

| Fonctionnalité | Description |
|----------------|-------------|
| Créer une cotisation | Définir une nouvelle cotisation (CNSS, IRPP, etc.) |
| Modifier une cotisation | Changer le taux, le plafond |
| Assigner aux employés | Lier une cotisation à des employés |

### 3.5 Gestion des rubriques

| Fonctionnalité | Description |
|----------------|-------------|
| Créer une rubrique | Définir une prime ou indemnité |
| Modifier une rubrique | Changer montant, caractéristiques fiscales |
| Assigner aux employés | Lier une rubrique à des employés |
| Ajouter ponctuellement | Ajouter une rubrique sur un bulletin spécifique |

---

## 4. API Endpoints

### 4.1 Profils employés

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/profiles` | Liste des profils |
| POST | `/api/payroll/profiles` | Créer un profil |
| GET | `/api/payroll/profiles/[id]` | Détail d'un profil |
| PUT | `/api/payroll/profiles/[id]` | Modifier un profil |
| DELETE | `/api/payroll/profiles/[id]` | Supprimer un profil |

### 4.2 Périodes de paie

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/periods` | Liste des périodes |
| POST | `/api/payroll/periods` | Créer une période |
| GET | `/api/payroll/periods/[id]` | Détail d'une période |
| PUT | `/api/payroll/periods/[id]` | Modifier une période |
| POST | `/api/payroll/periods/[id]/generate` | Générer les bulletins |

### 4.3 Bulletins de paie

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/[id]` | Détail d'un bulletin |
| PUT | `/api/payroll/[id]` | Modifier un bulletin |
| POST | `/api/payroll/[id]/validate` | Valider (RH) |
| POST | `/api/payroll/[id]/approve` | Approuver (Direction) |
| POST | `/api/payroll/[id]/pay` | Marquer comme payé |
| GET | `/api/payroll/print?ids=...` | Imprimer des bulletins |

### 4.4 Cotisations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/contributions` | Liste des cotisations |
| POST | `/api/payroll/contributions` | Créer une cotisation |
| PUT | `/api/payroll/contributions/[id]` | Modifier une cotisation |
| DELETE | `/api/payroll/contributions/[id]` | Supprimer une cotisation |

### 4.5 Rubriques

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/payroll/rubrics` | Liste des rubriques |
| POST | `/api/payroll/rubrics` | Créer une rubrique |
| PUT | `/api/payroll/rubrics/[id]` | Modifier une rubrique |
| DELETE | `/api/payroll/rubrics/[id]` | Supprimer une rubrique |
| GET | `/api/payroll/rubrics/[id]/employees` | Employés assignés |
| POST | `/api/payroll/rubrics/[id]/employees` | Assigner à des employés |

### 4.6 Sécurité d'accès

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/payroll/access/request-code` | Demander un code d'accès |
| POST | `/api/payroll/access/verify-code` | Vérifier le code |
| GET | `/api/payroll/access/config` | Configuration des emails |
| PUT | `/api/payroll/access/config` | Modifier la configuration |

---

## 5. Workflows et Séquences

### 5.1 Workflow de génération de paie

```
┌─────────────────┐
│  Créer période  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Générer bulletins│
│ (automatique)   │
└────────┬────────┘
         │
         │  Pour chaque employé actif:
         │  1. Récupérer pointage
         │  2. Calculer jours/heures
         │  3. Calculer salaire brut
         │  4. Appliquer cotisations
         │  5. Appliquer rubriques
         │  6. Calculer net
         │
         ▼
┌─────────────────┐
│ Bulletins DRAFT │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ajustements     │
│ manuels (opt.)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Validation RH   │
│ (VALIDATED)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Approbation Dir │
│ (APPROVED)      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Paiement        │
│ (PAID)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Clôture période │
└─────────────────┘
```

### 5.2 Séquence de calcul d'un bulletin

```
1. RÉCUPÉRATION DES DONNÉES
   │
   ├─► Profil employé (salaire, contrat, jours de travail)
   ├─► Période (dates, jours ouvrés)
   ├─► Pointage (heures travaillées)
   ├─► Cotisations assignées
   └─► Rubriques assignées

2. CALCUL DES HEURES
   │
   ├─► Jours ouvrés attendus = f(pattern employé, période)
   ├─► Heures brutes = données pointage
   ├─► Absences = ajustements type ABSENCE
   ├─► Heures travaillées = brutes - absences
   └─► Heures sup = travaillées - (jours × heures/jour)

3. CALCUL DU SALAIRE BRUT
   │
   ├─► CDI/CDD: (salaire_base / heures_attendues) × heures_travaillées
   ├─► STAGE: (gratification / jours_attendus) × jours_travaillés
   ├─► INTERIM: taux_journalier × jours_travaillés
   └─► FREELANCE: taux_horaire × heures_travaillées

4. CALCUL DES COTISATIONS
   │
   ├─► Pour chaque cotisation assignée:
   │   └─► montant = min(brut, plafond) × taux
   ├─► Total déductions = Σ cotisations salariales
   └─► Charges patronales = Σ cotisations patronales

5. CALCUL DES RUBRIQUES
   │
   ├─► Pour chaque rubrique assignée:
   │   ├─► FIXED: montant = montant_défaut
   │   ├─► GROSS_SALARY: montant = brut × taux
   │   ├─► BASE_SALARY: montant = salaire_base × taux
   │   └─► NET_SALARY: montant = (brut - cotisations) × taux
   ├─► Total primes = Σ rubriques type PRIME
   └─► Total indemnités = Σ rubriques type INDEMNITY

6. CALCUL DU NET
   │
   └─► Net = Brut - Cotisations + Primes + Indemnités + Bonus - Retenues
```

### 5.3 Workflow de modification manuelle

```
┌─────────────────┐
│ Ouvrir bulletin │
│ (EditPayrollSheet)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ Modifier salaire│────►│ Recalcul auto   │
│ brut            │     │ des cotisations │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│ Ajouter rubriques│
│ (Select)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Recalcul net    │
│ (temps réel)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Enregistrer     │
│ (API PUT)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Audit log créé  │
└─────────────────┘
```

---

## 6. Composants UI

### 6.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard/payroll` | Vue d'ensemble du module |
| Profils | `/dashboard/payroll/profiles` | Liste des profils employés |
| Détail profil | `/dashboard/payroll/profiles/[id]` | Détail d'un profil |
| Périodes | `/dashboard/payroll/periods` | Liste des périodes |
| Détail période | `/dashboard/payroll/periods/[id]` | Bulletins d'une période |
| Cotisations | `/dashboard/payroll/contributions` | Gestion des cotisations |
| Rubriques | `/dashboard/payroll/rubrics` | Gestion des rubriques |
| Paramètres | `/dashboard/payroll/settings` | Configuration du module |

### 6.2 Composants principaux

| Composant | Fichier | Description |
|-----------|---------|-------------|
| PayrollSidebar | `payroll-sidebar.tsx` | Navigation latérale |
| EditPayrollSheet | `edit-payroll-sheet.tsx` | Modification d'un bulletin |
| CreateRubricSheet | `create-rubric-sheet.tsx` | Création de rubrique |
| EditRubricSheet | `edit-rubric-sheet.tsx` | Modification de rubrique |
| RubricEmployeesSheet | `rubric-employees-sheet.tsx` | Assignation aux employés |

---

## 7. Calculs et Formules

### 7.1 Salaire brut

**CDI/CDD (prorata horaire):**
```
heures_attendues = jours_ouvrés_employé × heures_par_jour
salaire_brut = (salaire_base / heures_attendues) × heures_travaillées
```

**Heures supplémentaires:**
```
heures_sup = heures_travaillées - (jours_travaillés × heures_par_jour)
majoration = heures_sup × taux_horaire × (taux_majoration - 1)
```

### 7.2 Cotisations

```
base_calcul = min(salaire_brut, plafond_cotisation)
montant_cotisation = base_calcul × (taux / 100)
```

### 7.3 Rubriques

**Montant fixe:**
```
montant = montant_défaut (ou montant_personnalisé)
```

**Pourcentage:**
```
montant = base × (taux / 100)
base = salaire_brut | salaire_base | salaire_net
```

**Exonération:**
```
montant_exonéré = min(montant, plafond_exonération)
montant_imposable = max(0, montant - plafond_exonération)
```

### 7.4 Salaire net

```
net = brut 
    - cotisations_salariales 
    + primes 
    + indemnités 
    + bonus_manuels 
    - retenues_manuelles
    - cotisations_sur_rubriques_imposables
```

---

## 8. Sécurité

### 8.1 Accès au module

Le module de paie est protégé par un système de double authentification :

1. **Authentification standard** : Session utilisateur
2. **Code de vérification** : Code à 6 chiffres envoyé par email

```
┌─────────────────┐
│ Accès au module │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Demande de code │
│ (POST request-code)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Email envoyé à  │
│ l'adresse config│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Saisie du code  │
│ (POST verify-code)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Session paie    │
│ (cookie 1h)     │
└─────────────────┘
```

### 8.2 Audit trail

Toutes les modifications sur les bulletins sont tracées :
- Utilisateur
- Action
- Champ modifié
- Ancienne valeur
- Nouvelle valeur
- Date/heure

---

## 9. Améliorations futures

### 9.1 À implémenter

| Priorité | Fonctionnalité | Description |
|----------|----------------|-------------|
| **Haute** | Informations entreprise | Ajouter les infos légales sur les bulletins |
| **Haute** | Export comptable | Générer les écritures comptables |
| Moyenne | Virements bancaires | Génération de fichiers de virement |
| Moyenne | Déclarations sociales | Export CNSS, IRPP |
| Moyenne | Historique employé | Consulter tous les bulletins d'un employé |
| Basse | Simulation | Simuler un bulletin avant génération |
| Basse | Alertes | Notifications de validation en attente |

### 9.2 Informations entreprise à ajouter

Pour les bulletins de paie, il faut ajouter :

| Champ | Description | Obligatoire |
|-------|-------------|-------------|
| `companyName` | Raison sociale | ✅ |
| `companyAddress` | Adresse complète | ✅ |
| `companyCity` | Ville | ✅ |
| `companyCountry` | Pays | ✅ |
| `companyPhone` | Téléphone | ❌ |
| `companyEmail` | Email | ❌ |
| `companyLogo` | Logo (URL) | ❌ |
| `rccmNumber` | Numéro RCCM | ✅ |
| `nifNumber` | Numéro d'Identification Fiscale | ✅ |
| `cnssEmployerNumber` | Numéro CNSS employeur | ✅ |
| `conventionCollective` | Convention collective | ❌ |

---

## Annexes

### A. Énumérations

```typescript
enum EmployeeType {
  DECLARED    // Employé déclaré (cotisations sociales)
  UNDECLARED  // Employé non déclaré
}

enum ContractType {
  CDI         // Contrat à durée indéterminée
  CDD         // Contrat à durée déterminée
  STAGE       // Stage
  INTERIM     // Intérim
  FREELANCE   // Freelance
}

enum PayrollStatus {
  DRAFT       // Brouillon
  PENDING     // En attente de validation
  VALIDATED   // Validé par RH
  APPROVED    // Approuvé par Direction
  PAID        // Payé
  CANCELLED   // Annulé
}

enum PayrollPeriodType {
  MONTHLY     // Mensuel
  BIWEEKLY    // Bi-mensuel
  WEEKLY      // Hebdomadaire
}

enum RubricType {
  PRIME       // Prime
  INDEMNITY   // Indemnité
}

enum RubricCalculationBase {
  FIXED         // Montant fixe
  GROSS_SALARY  // % du salaire brut
  BASE_SALARY   // % du salaire de base
  NET_SALARY    // % du salaire net
}

enum AdjustmentType {
  BONUS       // Prime ponctuelle
  DEDUCTION   // Retenue
  ABSENCE     // Absence
  OVERTIME    // Heures supplémentaires
  ADVANCE     // Acompte
  OTHER       // Autre
}
```

### B. Fichiers clés

```
/app/dashboard/payroll/
├── layout.tsx              # Layout avec sidebar
├── page.tsx                # Dashboard principal
├── profiles/
│   ├── page.tsx            # Liste des profils
│   └── [id]/page.tsx       # Détail profil
├── periods/
│   ├── page.tsx            # Liste des périodes
│   └── [id]/page.tsx       # Détail période + bulletins
├── contributions/
│   └── page.tsx            # Gestion cotisations
├── rubrics/
│   └── page.tsx            # Gestion rubriques
└── settings/
    └── page.tsx            # Paramètres

/app/api/payroll/
├── [id]/
│   ├── route.ts            # GET/PUT bulletin
│   ├── validate/route.ts   # Validation RH
│   ├── approve/route.ts    # Approbation Direction
│   └── pay/route.ts        # Paiement
├── profiles/
│   ├── route.ts            # GET/POST profils
│   └── [id]/route.ts       # GET/PUT/DELETE profil
├── periods/
│   ├── route.ts            # GET/POST périodes
│   └── [id]/
│       ├── route.ts        # GET/PUT période
│       └── generate/route.ts # Génération bulletins
├── contributions/
│   ├── route.ts            # GET/POST cotisations
│   └── [id]/route.ts       # PUT/DELETE cotisation
├── rubrics/
│   ├── route.ts            # GET/POST rubriques
│   └── [id]/
│       ├── route.ts        # PUT/DELETE rubrique
│       └── employees/route.ts # Assignation employés
├── print/route.ts          # Impression bulletins
└── access/
    ├── request-code/route.ts # Demande code
    ├── verify-code/route.ts  # Vérification code
    └── config/route.ts       # Configuration emails

/components/payroll/
├── payroll-sidebar.tsx     # Navigation
├── edit-payroll-sheet.tsx  # Modification bulletin
├── create-rubric-sheet.tsx # Création rubrique
├── edit-rubric-sheet.tsx   # Modification rubrique
└── rubric-employees-sheet.tsx # Assignation employés

/lib/
└── payroll-calculator.ts   # Logique de calcul
```

---

*Document généré automatiquement - Module Paie v1.0*
