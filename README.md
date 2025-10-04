# 🚀 INTECH ERP

**INTECH ERP** est une plateforme complète de gestion d'entreprise (ERP/CRM) développée avec Next.js 15, React 19, TypeScript et Prisma. Le système offre une gestion avancée des utilisateurs, des contacts, des produits, des ventes, des opportunités et bien plus encore, avec un système de rôles et permissions granulaire.

---

## 📋 Table des matières

- [Fonctionnalités principales](#-fonctionnalités-principales)
- [Technologies utilisées](#-technologies-utilisées)
- [Architecture du projet](#-architecture-du-projet)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Scripts disponibles](#-scripts-disponibles)
- [Structure de la base de données](#-structure-de-la-base-de-données)
- [Système de permissions](#-système-de-permissions)
- [Modules de l'application](#-modules-de-lapplication)
- [API Routes](#-api-routes)
- [Déploiement](#-déploiement)

---

## ✨ Fonctionnalités principales

### 🔐 Authentification et Sécurité
- Authentification sécurisée avec NextAuth.js
- Gestion des sessions JWT (durée : 30 jours)
- Hashage des mots de passe avec bcryptjs
- Système de statuts utilisateurs (ACTIVE, INACTIVE, SUSPENDED)
- Audit logs pour tracer toutes les actions importantes

### 👥 Gestion des utilisateurs et rôles
- Système de rôles hiérarchique (Super Admin, Admin, Manager, Commercial, Utilisateur)
- Permissions granulaires par module et action
- Attribution dynamique de rôles
- Gestion des statuts utilisateurs
- Historique des assignations de rôles

### 📇 Gestion des contacts
- Contacts de type Personne ou Entreprise
- Statuts : Prospect, Client, Lead, Archive
- Assignation à des utilisateurs
- Tags personnalisables
- Photos de profil
- Informations détaillées (email, téléphone, poste, description)

### 📦 Gestion des produits
- Catalogue de produits avec catégories hiérarchiques
- Gestion des stocks avec mouvements tracés
- Prix d'achat et de vente
- TVA configurable
- Photos multiples par produit
- Types de mouvements : Entrée, Sortie, Ajustement, Vente, Retour

### 💰 Gestion commerciale
- **Devis** : Création, envoi, suivi (DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED)
- **Factures** : Génération, envoi, suivi des paiements (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
- Conversion devis → facture
- Calcul automatique des totaux, remises et taxes
- Articles de type Produit ou Service

### 🎯 Gestion des opportunités
- Suivi des opportunités commerciales
- Statuts : NEW, IN_PROGRESS, WON, LOST
- Assignation à un propriétaire
- Participants multiples
- Documents attachés
- Tâches associées

### ✅ Gestion des tâches
- Création et assignation de tâches
- Statuts : TODO, IN_PROGRESS, COMPLETED, CANCELLED
- Dates de début et d'échéance
- Liaison avec les opportunités
- Descriptions détaillées

### 📊 Système de rapports
- Tableaux de bord personnalisés
- Statistiques en temps réel
- Graphiques avec Recharts
- Exports de données

---

## 🛠 Technologies utilisées

### Frontend
- **Next.js 15.3.4** - Framework React avec App Router
- **React 19** - Bibliothèque UI
- **TypeScript 5** - Typage statique
- **TailwindCSS 4** - Framework CSS utility-first
- **Radix UI** - Composants accessibles et non stylés
- **Lucide React** - Icônes modernes
- **React Hook Form** - Gestion des formulaires
- **Zod** - Validation de schémas
- **Recharts** - Graphiques et visualisations
- **date-fns** - Manipulation de dates
- **Sonner** - Notifications toast

### Backend
- **NextAuth.js** - Authentification
- **Prisma** - ORM pour PostgreSQL
- **PostgreSQL** - Base de données relationnelle
- **bcryptjs** - Hashage de mots de passe

### Outils de développement
- **Turbopack** - Bundler ultra-rapide
- **ESLint** - Linter JavaScript/TypeScript
- **PostCSS** - Transformation CSS

---

## 📁 Architecture du projet

```
cmr-sambatech/
├── app/                          # App Router Next.js
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Authentification
│   │   ├── contacts/             # API Contacts
│   │   ├── products/             # API Produits
│   │   ├── quotes/               # API Devis
│   │   ├── invoices/             # API Factures
│   │   ├── opportunities/        # API Opportunités
│   │   ├── tasks/                # API Tâches
│   │   ├── users/                # API Utilisateurs
│   │   ├── roles/                # API Rôles
│   │   └── permissions/          # API Permissions
│   ├── dashboard/                # Pages du dashboard
│   │   ├── contacts/             # Module Contacts
│   │   ├── products/             # Module Produits
│   │   ├── sales/                # Module Ventes
│   │   ├── opportunities/        # Module Opportunités
│   │   ├── tasks/                # Module Tâches
│   │   ├── users/                # Module Utilisateurs
│   │   ├── roles/                # Module Rôles
│   │   └── pos/                  # Point de vente
│   ├── login/                    # Page de connexion
│   ├── layout.tsx                # Layout racine
│   ├── page.tsx                  # Page d'accueil
│   └── globals.css               # Styles globaux
├── components/                   # Composants React
│   ├── auth/                     # Composants d'authentification
│   ├── contacts/                 # Composants Contacts
│   ├── products/                 # Composants Produits
│   ├── sales/                    # Composants Ventes
│   ├── opportunities/            # Composants Opportunités
│   ├── tasks/                    # Composants Tâches
│   ├── users/                    # Composants Utilisateurs
│   ├── roles/                    # Composants Rôles
│   ├── navigation/               # Navigation
│   ├── providers/                # Providers React
│   └── ui/                       # Composants UI réutilisables
├── hooks/                        # Hooks React personnalisés
│   ├── use-auth.ts               # Hook d'authentification
│   ├── use-permissions.ts        # Hook de permissions
│   ├── use-mobile.ts             # Hook responsive
│   └── use-toast.ts              # Hook notifications
├── lib/                          # Utilitaires et configurations
│   ├── auth.ts                   # Configuration NextAuth
│   ├── auth-helpers.ts           # Helpers d'authentification
│   ├── prisma.ts                 # Client Prisma
│   └── utils.ts                  # Utilitaires divers
├── prisma/                       # Configuration Prisma
│   ├── schema.prisma             # Schéma de base de données
│   └── seed.ts                   # Données de seed
├── scripts/                      # Scripts utilitaires
│   └── verify-database.js        # Vérification BDD
├── types/                        # Types TypeScript
├── public/                       # Fichiers statiques
├── .env                          # Variables d'environnement
├── package.json                  # Dépendances npm
├── tsconfig.json                 # Configuration TypeScript
├── tailwind.config.js            # Configuration Tailwind
└── next.config.ts                # Configuration Next.js
```

---

## 🚀 Installation

### Prérequis

- **Node.js** 18+ ([Télécharger](https://nodejs.org/))
- **PostgreSQL** 14+ ([Télécharger](https://www.postgresql.org/download/))
- **npm** ou **yarn**

### Étapes d'installation

1. **Cloner le dépôt**

```bash
git clone <repository-url>
cd cmr-sambatech
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer la base de données**

Créez une base de données PostgreSQL :

```sql
CREATE DATABASE intech_erp;
```

4. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet :

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/intech_erp?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
```

> ⚠️ **Important** : Changez `NEXTAUTH_SECRET` en production avec une clé aléatoire sécurisée.

5. **Setup automatique**

```bash
npm run setup
```

Cette commande va :
- Générer le client Prisma
- Créer les tables dans la base de données
- Insérer les données initiales (seed)
- Vérifier la configuration

**OU manuellement :**

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables
npx prisma db push

# Insérer les données initiales
npx prisma db seed

# Vérifier la base de données
npm run db:verify
```

6. **Démarrer l'application**

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Comptes de test

Après le seed, vous pouvez vous connecter avec :

- **Email** : `admin@example.com`
- **Mot de passe** : `password`

### Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL de connexion PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_URL` | URL de l'application | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Clé secrète pour JWT | Chaîne aléatoire sécurisée |

---

## 📜 Scripts disponibles

```bash
# Développement
npm run dev              # Démarrer en mode développement (avec Turbopack)
npm run build            # Build pour production
npm run start            # Démarrer en mode production
npm run lint             # Linter le code

# Base de données
npm run db:generate      # Générer le client Prisma
npm run db:push          # Pousser le schéma vers la BDD
npm run db:seed          # Insérer les données de test
npm run db:reset         # Reset complet + seed
npm run db:studio        # Ouvrir Prisma Studio (interface graphique)
npm run db:verify        # Vérifier la configuration BDD

# Setup complet
npm run setup            # Installation complète (install + generate + push + seed + verify)
```

---

## 🗄 Structure de la base de données

### Modèles principaux

#### **User** (Utilisateurs)
- Informations personnelles (nom, prénom, email)
- Statut (ACTIVE, INACTIVE, SUSPENDED)
- Relations : rôles, tâches, opportunités, contacts

#### **Role** (Rôles)
- Nom et description
- Indicateur système (non supprimable)
- Relations : utilisateurs, permissions

#### **Permission** (Permissions)
- Nom unique (ex: `users.create`)
- Module et action
- Relations : rôles

#### **Contact** (Contacts)
- Type (PERSONNE, ENTREPRISE)
- Statut (PROSPECT, CLIENT, LEAD, ARCHIVE)
- Informations complètes
- Relations : devis, factures, opportunités

#### **Product** (Produits)
- Informations produit
- Prix d'achat/vente, TVA
- Stock et mouvements
- Relations : catégories, devis, factures

#### **Quote** (Devis)
- Numéro unique
- Statuts multiples
- Calculs automatiques
- Relations : contact, articles, factures

#### **Invoice** (Factures)
- Numéro unique
- Statuts de paiement
- Dates d'échéance
- Relations : contact, devis, articles

#### **Opportunity** (Opportunités)
- Titre et description
- Statut de progression
- Relations : contact, propriétaire, tâches, documents

#### **Task** (Tâches)
- Titre et description
- Statut et dates
- Relations : utilisateur, opportunité

#### **StockMovement** (Mouvements de stock)
- Type de mouvement
- Quantité (positive/négative)
- Relations : produit, utilisateur

#### **AuditLog** (Logs d'audit)
- Action effectuée
- Entité et ID
- Payload JSON
- Relations : utilisateur

---

## 🔒 Système de permissions

### Rôles pré-configurés

1. **Super Admin** - Accès complet à toutes les fonctionnalités
2. **Admin** - Accès administrateur avec quelques restrictions
3. **Manager** - Gestion d'équipe et supervision
4. **Commercial** - Fonctionnalités commerciales (contacts, ventes, opportunités)
5. **Utilisateur** - Accès en lecture seule

### Modules de permissions

Les permissions sont organisées par modules :

- `users.*` - Gestion des utilisateurs (create, read, update, delete)
- `roles.*` - Gestion des rôles et permissions
- `contacts.*` - Gestion des contacts
- `products.*` - Gestion des produits et stock
- `quotes.*` - Gestion des devis
- `invoices.*` - Gestion des factures
- `tasks.*` - Gestion des tâches
- `opportunities.*` - Gestion des opportunités
- `reports.*` - Accès aux rapports et statistiques

### Utilisation des permissions

```typescript
import { usePermissions } from "@/hooks/use-permissions"

function MyComponent() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()
  
  // Vérifier une permission
  if (hasPermission("users.create")) {
    // Afficher le bouton de création
  }
  
  // Vérifier plusieurs permissions (OU)
  if (hasAnyPermission(["users.update", "users.delete"])) {
    // Afficher les actions
  }
  
  // Vérifier plusieurs permissions (ET)
  if (hasAllPermissions(["contacts.read", "contacts.update"])) {
    // Afficher le formulaire d'édition
  }
}
```

---

## 📦 Modules de l'application

### 🏠 Dashboard
- Vue d'ensemble des statistiques
- Graphiques de performance
- Activités récentes
- Raccourcis rapides

### 👥 Contacts
- Liste et recherche de contacts
- Création/édition de contacts
- Gestion des statuts et tags
- Historique des interactions

### 📦 Produits
- Catalogue de produits
- Gestion des catégories
- Suivi des stocks
- Mouvements de stock

### 💼 Ventes
- Création de devis
- Génération de factures
- Suivi des paiements
- Conversion devis → facture

### 🎯 Opportunités
- Pipeline de ventes
- Suivi des opportunités
- Gestion des participants
- Documents attachés

### ✅ Tâches
- Liste de tâches
- Assignation et suivi
- Dates d'échéance
- Filtres par statut

### 👤 Utilisateurs
- Gestion des comptes
- Attribution de rôles
- Statuts utilisateurs
- Historique d'activité

### 🔐 Rôles et Permissions
- Création de rôles personnalisés
- Attribution de permissions
- Gestion des accès
- Rôles système protégés

---

## 🌐 API Routes

### Authentification
- `POST /api/auth/signin` - Connexion
- `POST /api/auth/signout` - Déconnexion
- `GET /api/auth/session` - Session actuelle

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs
- `POST /api/users` - Créer un utilisateur
- `GET /api/users/[id]` - Détails d'un utilisateur
- `PUT /api/users/[id]` - Mettre à jour un utilisateur
- `DELETE /api/users/[id]` - Supprimer un utilisateur
- `GET /api/users/[id]/permissions` - Permissions d'un utilisateur

### Contacts
- `GET /api/contacts` - Liste des contacts
- `POST /api/contacts` - Créer un contact
- `GET /api/contacts/[id]` - Détails d'un contact
- `PUT /api/contacts/[id]` - Mettre à jour un contact
- `DELETE /api/contacts/[id]` - Supprimer un contact

### Produits
- `GET /api/products` - Liste des produits
- `POST /api/products` - Créer un produit
- `GET /api/products/[id]` - Détails d'un produit
- `PUT /api/products/[id]` - Mettre à jour un produit
- `DELETE /api/products/[id]` - Supprimer un produit
- `POST /api/products/[id]/stock` - Mouvement de stock

### Devis & Factures
- `GET /api/quotes` - Liste des devis
- `POST /api/quotes` - Créer un devis
- `GET /api/invoices` - Liste des factures
- `POST /api/invoices` - Créer une facture

### Opportunités
- `GET /api/opportunities` - Liste des opportunités
- `POST /api/opportunities` - Créer une opportunité
- `GET /api/opportunities/[id]` - Détails d'une opportunité
- `PUT /api/opportunities/[id]` - Mettre à jour une opportunité
- `DELETE /api/opportunities/[id]` - Supprimer une opportunité

### Tâches
- `GET /api/tasks` - Liste des tâches
- `POST /api/tasks` - Créer une tâche
- `PUT /api/tasks/[id]` - Mettre à jour une tâche
- `DELETE /api/tasks/[id]` - Supprimer une tâche

### Rôles & Permissions
- `GET /api/roles` - Liste des rôles
- `POST /api/roles` - Créer un rôle
- `GET /api/permissions` - Liste des permissions
- `POST /api/roles/[id]/permissions` - Attribuer des permissions

---

## 🚀 Déploiement

### Vercel (Recommandé)

1. Pushez votre code sur GitHub
2. Importez le projet sur [Vercel](https://vercel.com)
3. Configurez les variables d'environnement
4. Déployez !

### Variables d'environnement en production

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_URL="https://votre-domaine.com"
NEXTAUTH_SECRET="votre-clé-secrète-production"
```

### Build manuel

```bash
npm run build
npm run start
```

---

## 📝 Licence

Ce projet est privé et propriétaire.

---

## 🤝 Support

Pour toute question ou problème, contactez l'équipe de développement.

---

**Développé avec ❤️ par l'équipe INTECH**
