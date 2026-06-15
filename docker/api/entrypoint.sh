#!/bin/sh
set -e

# Vérification que DATABASE_URL est bien injecté par docker-compose
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL est vide — vérifier le .env et docker-compose"
  exit 1
fi
echo "✅ DATABASE_URL reçu : ${DATABASE_URL%%@*}@..."

echo "▶ Prisma migrate deploy..."
npx prisma migrate deploy

echo "▶ Démarrage NestJS..."
exec node dist/src/main
