#!/bin/bash

echo "📦 Installation des dépendances manquantes..."

# Installer ts-node si pas déjà installé
npm install --save-dev ts-node

# Installer bcryptjs si pas déjà installé
npm install bcryptjs
npm install --save-dev @types/bcryptjs

echo "✅ Dépendances installées"
