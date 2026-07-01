#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL est vide — vérifier le .env et docker-compose"
  exit 1
fi
echo "✅ DATABASE_URL reçu : ${DATABASE_URL%%@*}@..."

echo "▶ Création du schéma PostgreSQL 'collecte' si nécessaire..."
node -e "
const { Client } = require('pg');
const url = process.env.DATABASE_URL.replace('?schema=collecte', '');
const client = new Client({ connectionString: url });
client.connect()
  .then(() => client.query('CREATE SCHEMA IF NOT EXISTS collecte'))
  .then(() => { console.log('Schéma collecte OK'); client.end(); })
  .catch(e => { console.error(e); client.end(); process.exit(1); });
"

echo "▶ Prisma db push (schema incremental)..."
npx prisma db push --accept-data-loss

echo "▶ Seed idempotent (upsert input_types + entités + sections)..."
npx tsx prisma/seed.ts

echo "▶ Démarrage NestJS collecte-api..."
exec node dist/src/main
