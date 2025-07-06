#!/bin/bash

echo "🚀 Setup complet du CRM..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Fichier .env manquant!${NC}"
    echo "Créez un fichier .env avec:"
    echo "DATABASE_URL=\"postgresql://username:password@localhost:5432/crm_db\""
    echo "NEXTAUTH_SECRET=\"your-secret-key\""
    echo "NEXTAUTH_URL=\"http://localhost:3000\""
    exit 1
fi

echo -e "${YELLOW}📦 Installation des dépendances...${NC}"
npm install
npm install --save-dev ts-node

echo -e "${YELLOW}🔧 Génération du client Prisma...${NC}"
npx prisma generate

echo -e "${YELLOW}🗄️ Création des tables...${NC}"
npx prisma db push

echo -e "${YELLOW}🌱 Exécution du seed...${NC}"
npx prisma db seed

echo -e "${YELLOW}🔍 Vérification...${NC}"
npm run db:verify

echo -e "${GREEN}🎉 Setup terminé!${NC}"
