#!/bin/bash

echo "🔄 Reset de la base de données..."

# Reset de la base de données
echo "🗑️ Suppression des données..."
npx prisma db push --force-reset

# Re-seed
echo "🌱 Re-seed de la base de données..."
npx prisma db seed

echo "✅ Base de données réinitialisée !"
