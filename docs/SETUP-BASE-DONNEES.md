# Base de données avec Prisma — INTECH / Madame Solde

Ce guide relie ton projet Next.js à **PostgreSQL** et applique le **schéma** (`prisma/schema.prisma`) + le **seed** initial.

## Prérequis

- Node.js (déjà installé)
- **Soit** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (recommandé sur Windows)  
- **Soit** un PostgreSQL hébergé (Neon, Supabase, Railway, etc.)

## Étape 1 — Fichier `.env`

1. Copie le modèle :
   ```powershell
   cd crm-permissions
   copy .env.example .env
   ```
2. Ouvre `.env` et :
   - garde `DATABASE_URL` si tu utilises Docker (voir ci‑dessous) ;
   - **ou** colle l’URL fournie par Neon / Supabase.

3. Remplace `NEXTAUTH_SECRET` et `JWT_SECRET` par de **vrais** secrets longs (ne les commit jamais).

**Générer un secret (PowerShell)** :

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

Colle le résultat dans `NEXTAUTH_SECRET` et un second tirage dans `JWT_SECRET`.

## Étape 2A — PostgreSQL avec Docker

```powershell
docker compose up -d
```

L’URL par défaut dans `.env.example` correspond à ce conteneur.

## Étape 2B — PostgreSQL cloud

Crée une base sur [neon.tech](https://neon.tech) ou [supabase.com](https://supabase.com), copie la **connection string** (avec `?sslmode=require` si demandé) dans `DATABASE_URL`.

## Étape 3 — Prisma (générer le client + créer les tables)

```powershell
npm install
npx prisma generate
npx prisma db push
```

- `db push` : crée / met à jour **toutes** les tables du `schema.prisma` (≈ 90 modèles).
- Il n’y a pas de dossier `migrations` dans ce repo : on utilise le mode **push**.

## Étape 4 — Données initiales (seed)

```powershell
npx prisma db seed
```

Cela exécute `prisma/seed.ts` (rôles, permissions, compte admin de test, etc.).

## Étape 5 — Vérifier (optionnel)

```powershell
npm run db:verify
```

## Étape 6 — Lancer l’app

```powershell
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

**Compte admin** : voir la fin de `prisma/seed.ts` (email / mot de passe affichés en console après le seed).

## Outils utiles

- Interface visuelle des données : `npm run db:studio`
- Tout réinitialiser (⚠️ efface les données) : `npm run db:reset`

## Dépannage

| Problème | Piste |
|----------|--------|
| `Can't reach database` | Docker est‑il démarré ? Port 5432 libre ? `DATABASE_URL` correct ? |
| Seed échoue sur `ts-node` | Lance `npm install` (ts-node est en devDependency du projet). |
| Erreur SSL (cloud) | Ajoute `?sslmode=require` à la fin de `DATABASE_URL`. |
