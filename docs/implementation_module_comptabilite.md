# 📋 Plan d'Implémentation — Module Comptabilité (Global)

## Vue d'ensemble

Ce document détaille l'implémentation du module comptabilité pour le CRM Sambatech, basé sur le PRD `prd_module_comptabilite_magasin.md`.

## ⚠️ Architecture

Le module comptabilité est un **module global du système**, accessible depuis `/dashboard/accounting`, avec des permissions globales. Les dépenses peuvent être :
- **Liées à un magasin** (`storeId` renseigné) — Ex: Loyer du magasin X
- **Non liées à un magasin** (`storeId` null) — Ex: Frais comptable, Assurance entreprise

---

## 1. Modèles de Données (Prisma)

### 1.1 Nouveaux Enums

```prisma
enum ExpenseStatus {
  PENDING          // En attente
  PARTIALLY_PAID   // Payée partiellement
  PAID             // Payée
}

enum ExpensePeriodicity {
  ONCE        // Unique
  WEEKLY      // Hebdomadaire
  MONTHLY     // Mensuelle
  YEARLY      // Annuelle
}

enum ExpensePaymentMode {
  CASH          // Caisse
  BANK          // Banque
  MOBILE_MONEY  // Mobile Money
}
```

### 1.2 Nouveaux Modèles

#### `ExpenseCategory` — Types de dépenses (GLOBAL)
```prisma
model ExpenseCategory {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  icon        String?
  color       String?
  isActive    Boolean  @default(true) @map("is_active")
  isSystem    Boolean  @default(false) @map("is_system")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  expenses Expense[]

  @@index([isActive])
  @@map("expense_categories")
}
```

#### `Expense` — Dépenses
```prisma
model Expense {
  id              String             @id @default(cuid())
  storeId         String?            @map("store_id")  // OPTIONNEL
  categoryId      String             @map("category_id")
  
  title           String
  description     String?
  amount          Float
  
  supplierName    String?            @map("supplier_name")
  supplierPhone   String?            @map("supplier_phone")
  
  dueDate         DateTime           @map("due_date")
  periodicity     ExpensePeriodicity @default(ONCE)
  paymentDay      Int?               @map("payment_day")
  
  documentUrl     String?            @map("document_url")
  documentName    String?            @map("document_name")
  
  status          ExpenseStatus      @default(PENDING)
  paidAmount      Float              @default(0) @map("paid_amount")
  remainingAmount Float              @map("remaining_amount")
  
  parentExpenseId String?            @map("parent_expense_id")
  isRecurring     Boolean            @default(false) @map("is_recurring")
  
  createdById     String             @map("created_by_id")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  store           Store?             @relation(fields: [storeId], references: [id], onDelete: SetNull)
  category        ExpenseCategory    @relation(fields: [categoryId], references: [id])
  createdBy       User               @relation("ExpenseCreator", fields: [createdById], references: [id])
  parentExpense   Expense?           @relation("RecurringExpenses", fields: [parentExpenseId], references: [id])
  childExpenses   Expense[]          @relation("RecurringExpenses")
  payments        ExpensePayment[]

  @@index([storeId])
  @@index([categoryId])
  @@index([status])
  @@index([dueDate])
  @@map("expenses")
}
```

#### `ExpensePayment` — Paiements
```prisma
model ExpensePayment {
  id           String             @id @default(cuid())
  expenseId    String             @map("expense_id")
  
  amount       Float
  paymentDate  DateTime           @map("payment_date")
  paymentMode  ExpensePaymentMode @map("payment_mode")
  reference    String?
  
  receiptUrl   String?            @map("receipt_url")
  receiptName  String?            @map("receipt_name")
  notes        String?
  
  paidById     String             @map("paid_by_id")
  createdAt    DateTime           @default(now()) @map("created_at")

  expense      Expense            @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  paidBy       User               @relation("ExpensePaymentPayer", fields: [paidById], references: [id])

  @@index([expenseId])
  @@index([paymentDate])
  @@map("expense_payments")
}
```

---

## 2. Permissions (Globales)

```typescript
// Module accounting (comptabilité)
{ name: "accounting.view", description: "Voir la comptabilité", module: "accounting", action: "view" },
{ name: "accounting.dashboard", description: "Voir le tableau de bord comptable", module: "accounting", action: "dashboard" },
{ name: "accounting.expenses.view", description: "Voir les dépenses", module: "accounting", action: "view" },
{ name: "accounting.expenses.create", description: "Créer des dépenses", module: "accounting", action: "create" },
{ name: "accounting.expenses.edit", description: "Modifier les dépenses", module: "accounting", action: "edit" },
{ name: "accounting.expenses.delete", description: "Supprimer les dépenses", module: "accounting", action: "delete" },
{ name: "accounting.expenses.pay", description: "Enregistrer des paiements", module: "accounting", action: "pay" },
{ name: "accounting.categories.view", description: "Voir les catégories", module: "accounting", action: "view" },
{ name: "accounting.categories.manage", description: "Gérer les catégories", module: "accounting", action: "manage" },
{ name: "accounting.reports.view", description: "Voir les rapports", module: "accounting", action: "view" },
{ name: "accounting.reports.export", description: "Exporter les rapports", module: "accounting", action: "export" },
```

---

## 3. API Endpoints

### 3.1 Catégories
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/accounting/categories` | Liste des catégories |
| `POST` | `/api/accounting/categories` | Créer une catégorie |
| `PUT` | `/api/accounting/categories/[id]` | Modifier une catégorie |
| `DELETE` | `/api/accounting/categories/[id]` | Supprimer une catégorie |

### 3.2 Dépenses
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/accounting/expenses` | Liste (filtres: storeId, status, category, dateRange) |
| `GET` | `/api/accounting/expenses/[id]` | Détails d'une dépense |
| `POST` | `/api/accounting/expenses` | Créer une dépense |
| `PUT` | `/api/accounting/expenses/[id]` | Modifier une dépense |
| `DELETE` | `/api/accounting/expenses/[id]` | Supprimer une dépense |

### 3.3 Paiements
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/accounting/expenses/[id]/payments` | Historique des paiements |
| `POST` | `/api/accounting/expenses/[id]/payments` | Enregistrer un paiement |
| `DELETE` | `/api/accounting/expenses/[id]/payments/[paymentId]` | Annuler un paiement |

### 3.4 Dashboard & Stats
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/accounting/dashboard` | Stats globales |
| `GET` | `/api/accounting/stats` | Statistiques détaillées |
| `GET` | `/api/accounting/export` | Export CSV/Excel |

### 3.5 Cron
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/cron/generate-recurring-expenses` | Génération dépenses récurrentes |

---

## 4. Structure des Fichiers

### 4.1 API Routes
```
app/api/accounting/
├── categories/
│   ├── route.ts
│   └── [id]/route.ts
├── expenses/
│   ├── route.ts
│   └── [id]/
│       ├── route.ts
│       └── payments/
│           ├── route.ts
│           └── [paymentId]/route.ts
├── dashboard/route.ts
├── stats/route.ts
└── export/route.ts
```

### 4.2 Pages Dashboard
```
app/dashboard/accounting/
├── page.tsx                    # Dashboard principal
├── expenses/page.tsx           # Liste des dépenses
├── categories/page.tsx         # Gestion des catégories
└── reports/page.tsx            # Rapports détaillés
```

### 4.3 Composants
```
components/accounting/
├── index.ts
├── expense-form.tsx
├── expense-card.tsx
├── expense-details-sheet.tsx
├── expense-payment-form.tsx
├── expense-payment-history.tsx
├── expense-status-badge.tsx
├── expense-filters.tsx
├── expense-store-badge.tsx
├── category-form.tsx
├── category-list.tsx
├── accounting-dashboard.tsx
├── accounting-stats-cards.tsx
└── accounting-chart.tsx
```

---

## 5. Catégories par Défaut

| Nom | Icône | Couleur |
|-----|-------|---------|
| Achat Fournisseur | Package | #3B82F6 |
| Salaire | Users | #10B981 |
| Transport | Truck | #F59E0B |
| Internet | Wifi | #8B5CF6 |
| Loyer | Home | #EF4444 |
| Électricité | Zap | #F97316 |
| Eau | Droplet | #06B6D4 |
| Prestation | Briefcase | #6366F1 |
| Impôts & Taxes | FileText | #DC2626 |
| Assurance | Shield | #059669 |
| Autre | MoreHorizontal | #6B7280 |

---

## 6. Plan d'Exécution

### Phase 1 : Base de données (1-2 jours)
- [ ] Ajouter les enums au schéma Prisma
- [ ] Créer les modèles `ExpenseCategory`, `Expense`, `ExpensePayment`
- [ ] Mettre à jour les relations `Store` et `User`
- [ ] Créer et exécuter la migration
- [ ] Ajouter les permissions au seed
- [ ] Ajouter les catégories par défaut au seed

### Phase 2 : API Backend (2-3 jours)
- [ ] Routes catégories
- [ ] Routes dépenses
- [ ] Routes paiements
- [ ] Route dashboard
- [ ] Route stats
- [ ] Job cron dépenses récurrentes

### Phase 3 : Composants UI (2-3 jours)
- [ ] Composants de base
- [ ] Formulaire dépense
- [ ] Formulaire paiement
- [ ] Liste dépenses avec filtres
- [ ] Sheet détails

### Phase 4 : Pages Dashboard (2 jours)
- [ ] Page dashboard comptabilité
- [ ] Page liste dépenses
- [ ] Page catégories
- [ ] Ajouter module dans page principale

### Phase 5 : Tests & Finitions (1-2 jours)
- [ ] Tests API
- [ ] Tests calculs
- [ ] Responsive design

---

## 7. Estimation

| Phase | Durée |
|-------|-------|
| Phase 1 : Base de données | 1-2 jours |
| Phase 2 : API Backend | 2-3 jours |
| Phase 3 : Composants UI | 2-3 jours |
| Phase 4 : Pages Dashboard | 2 jours |
| Phase 5 : Tests | 1-2 jours |
| **Total** | **8-12 jours** |

---

**Prêt pour l'implémentation !** 🚀
