#!/bin/bash
# deploy-staging.sh — Déploiement staging (appelé par GitHub Actions)
set -e

APP_DIR="/home/markov/lhspla"
cd "$APP_DIR"

echo "▶ [Staging] Pull des nouvelles images..."
docker compose -f docker-compose.staging.yml --env-file .env.staging pull

echo "▶ [Staging] Démarrage des containers..."
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --remove-orphans

echo "▶ [Staging] Seed initial (idempotent)..."
sleep 8
docker exec stg-api sh -c "npx ts-node prisma/seed.ts" 2>/dev/null || true

echo "▶ [Staging] Health check (port 8080)..."
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/health 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "✅ [Staging] Opérationnel — http://vps.lhspla-ci.org:8080"
else
  echo "⚠️  [Staging] Health check: HTTP $STATUS (peut être normal au premier démarrage)"
fi

docker image prune -f --filter "until=24h" 2>/dev/null || true
