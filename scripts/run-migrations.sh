#!/bin/bash

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Démarrage des migrations CRM...${NC}"

# Vérifier si .env existe
if [ ! -f .env ]; then
    echo -e "${RED}❌ Fichier .env manquant!${NC}"
    echo "Créez un fichier .env avec DATABASE_URL"
    exit 1
fi

# Charger les variables d'environnement
source .env

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL non définie dans .env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Configuration trouvée${NC}"

# Fonction pour exécuter un fichier SQL
run_sql_file() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}📄 Exécution: $description${NC}"
    
    if [ -f "$file" ]; then
        psql "$DATABASE_URL" -f "$file"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ $description - Terminé${NC}"
        else
            echo -e "${RED}❌ $description - Erreur${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Fichier $file non trouvé${NC}"
        exit 1
    fi
}

# Exécuter les migrations dans l'ordre
run_sql_file "migrations/001_initial_schema.sql" "Création du schéma"
run_sql_file "migrations/002_seed_data.sql" "Insertion des données"

echo -e "${YELLOW}🔍 Vérification des données...${NC}"
run_sql_file "migrations/003_verify_data.sql" "Vérification"

echo -e "${GREEN}🎉 Migrations terminées avec succès!${NC}"
echo -e "${GREEN}📧 Compte admin: admin@example.com${NC}"
echo -e "${GREEN}🔑 Mot de passe: password${NC}"
