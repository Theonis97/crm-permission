# INTECH ERP - Système de Gestion Intégrée

## À propos du projet

**INTECH ERP** est une solution complète de gestion d'entreprise (ERP) et de relation client (CRM) conçue pour centraliser les opérations commerciales, logistiques et administratives. Cette plateforme robuste permet une gestion précise des ventes, des stocks, de la logistique du dernier kilomètre, et des ressources humaines.

## 🛠 Stack Technique

- **Framework** : [Next.js 16 (App Router)](https://nextjs.org/)
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **Style** : [Tailwind CSS 4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Base de données** : [PostgreSQL](https://www.postgresql.org/) via [Prisma ORM](https://www.prisma.io/)
- **Authentification** : [NextAuth.js](https://next-auth.js.org/)
- **Visualisation** : [Recharts](https://recharts.org/) (Dashboards) & [Leaflet](https://leafletjs.com/) (Cartographie)
- **Stockage** : [AWS S3](https://aws.amazon.com/s3/) (via SDK v3)
- **Notifications** : [Expo Server SDK](https://docs.expo.dev/push-notifications/overview/) & [Nodemailer](https://nodemailer.com/)

## Modules Principaux

### CRM & Ventes
- **Pipeline de vente** : Gestion des prospects, opportunités et contacts.
- **Documents commerciaux** : Devis, factures et suivi de paiement.
- **POS (Point de Vente)** : Interface dédiée pour les ventes en magasin physique.
- **Paiements Mobiles** : Intégration MoneyFusion (Mobile Money) avec gestion des frais.

### Stocks & Logistique
- **Multi-Store** : Gestion de stocks segmentée par boutiques et entrepôts centraux.
- **Dernier Kilomètre** : Gestion des livreurs, zones de livraison personnalisées et suivi GPS en temps réel.
- **Mouvements** : Traçabilité complète des transferts, entrées et sorties de stock.
- **SAV** : Système de gestion des retours produits et échanges.

### RH & Paie
- **Pointage intelligent** : Système de présence via QR Code ou NFC.
- **Moteur de Paie** : Calcul des salaires, primes, retenues et cotisations sociales.
- **Contrats** : Gestion administrative des différents types de collaborateurs.

### Comptabilité & GED
- **Finance** : Suivi des dépenses opérationnelles et recettes journalières.
- **GED** : Gestion Électronique des Documents pour centraliser les pièces jointes et archives.

## Documentation Détaillée

Le projet contient une documentation exhaustive située dans le dossier [`/docs`](./docs) :

- [**Guide des Permissions**](./docs/GUIDE-PERMISSIONS-FR.md) : Comprendre le système RBAC.
- [**Logistique & Livraison**](./docs/DRIVER-ORDER-WORKFLOW.md) : Workflow des commandes livreurs.
- [**Zones de Livraison**](./docs/DELIVERY-ZONES-GUIDE.md) : Gestion cartographique.
- [**Module de Paie**](./docs/PAYROLL_MODULE_README.md) : Architecture du moteur de paie.
- [**Gestion Documentaire (GED)**](./docs/MODULE_GED_PLAN.md) : Plan d'implémentation de la GED.
- [**Intégration MoneyFusion**](./docs/MONEYFUSION.md) : Détails techniques du paiement mobile.
- [**Setup Database**](./docs/SETUP-BASE-DONNEES.md) : Guide d'installation de la DB.

## Installation & Démarrage

### Prérequis
- Node.js 20+
- Docker & Docker Compose
- Un fichier `.env` configuré (voir `.env.example` si disponible)

### Configuration rapide
1. **Lancer la base de données** :
   ```bash
   docker compose up -d
   ```

2. **Installation complète** :
   ```bash
   npm run setup
   ```

3. **Démarrer l'application** :
   ```bash
   npm run dev
   ```

### Configuration Webhooks (Développement)
Pour recevoir les notifications de paiement en local (MoneyFusion, etc.), utilisez **ngrok** pour exposer votre serveur :
1. Démarrez ngrok :
   ```bash
   ngrok http 3000
   ```
2. Mettez à jour `NEXT_PUBLIC_APP_URL` dans votre `.env` avec l'URL fournie par ngrok :
   ```env
   NEXT_PUBLIC_APP_URL="https://a08f-135-136-39-5.ngrok-free.app"
   ```

## Intégration MoneyFusion

L'intégration de MoneyFusion permet de gérer les paiements mobiles de manière transparente.

### Architecture
- **Service** : [`lib/moneyfusion.ts`](./lib/moneyfusion.ts) - Logique métier et calcul des frais (8%).
- **Route API** : [`app/api/payments/moneyfusion/route.ts`](./app/api/payments/moneyfusion/route.ts) - Initiation des paiements.
- **Webhook** : [`app/api/webhooks/moneyfusion/route.ts`](./app/api/webhooks/moneyfusion/route.ts) - Traitement des retours asynchrones.
- **Frontend** : Intégration dans le POS ([`PosCheckoutDialog.tsx`](./app/dashboard/stores/[id]/pos/components/PosCheckoutDialog.tsx)) avec redirection automatique.

## Scripts Clés

- `npm run permissions:add` : Synchronise les nouvelles permissions avec la DB.
- `npm run db:seed` : Initialise les données de test et de configuration.
- `npm run permissions:matrix` : Affiche la matrice des droits d'accès actuelle.

---
Développé avec ❤️ par **SambaTech Team**.
