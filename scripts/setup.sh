#!/bin/bash

echo "🚀 Configuration du CRM avec Prisma..."

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo "⚠️  Veuillez configurer vos variables d'environnement dans le fichier .env"
    exit 1
fi

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate

# Pousser le schéma vers la base de données
echo "🗄️ Création des tables..."
npx prisma db push

# Exécuter le seed
echo "🌱 Exécution du seed..."
npx prisma db seed

echo "✅ Configuration terminée !"
echo "🎉 Vous pouvez maintenant démarrer l'application avec: npm run dev"
