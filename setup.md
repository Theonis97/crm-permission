# Configuration d'INTECH ERP

## Prérequis

- Node.js 18+
- PostgreSQL
- npm ou yarn

## Installation

### 1. Cloner et installer les dépendances

\`\`\`bash
npm install
\`\`\`

### 2. Configuration de la base de données

Créer une base de données PostgreSQL et configurer le fichier `.env` :

\`\`\`env
DATABASE_URL="postgresql://username:password@localhost:5432/crm_db?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
\`\`\`

### 3. Setup automatique

\`\`\`bash
npm run setup
\`\`\`

Ou manuellement :

\`\`\`bash
# Générer le client Prisma
npx prisma generate

# Créer les tables
npx prisma db push

# Insérer les données initiales
npx prisma db seed
\`\`\`

### 4. Démarrer l'application

\`\`\`bash
npm run dev
\`\`\`

## Comptes de test

Après le seed, vous pouvez vous connecter avec :

- **Email**: admin@example.com
- **Mot de passe**: password

## Scripts utiles

\`\`\`bash
# Voir la base de données dans le navigateur
npm run db:studio

# Reset complet de la base de données
npm run db:reset

# Re-générer le client Prisma après modification du schéma
npm run db:generate
\`\`\`

## Structure des rôles

Le système est livré avec 5 rôles pré-configurés :

1. **Super Admin** - Accès complet
2. **Admin** - Accès administrateur avec restrictions
3. **Manager** - Gestion d'équipe
4. **Commercial** - Fonctionnalités commerciales
5. **Utilisateur** - Accès en lecture seule

## Permissions

Les permissions sont organisées par modules :
- `users.*` - Gestion des utilisateurs
- `roles.*` - Gestion des rôles
- `contacts.*` - Gestion des contacts
- `products.*` - Gestion des produits
- `quotes.*` - Devis
- `invoices.*` - Factures
- `tasks.*` - Tâches
- `opportunities.*` - Opportunités
- `reports.*` - Rapports
