#!/bin/bash
# deploy-prod.sh — Déploiement production (appelé par GitHub Actions)
set -e

APP_DIR="/home/markov"
cd "$APP_DIR"

echo "▶ [Prod] Vérification staging sain avant déploiement..."
STG_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  http://vps.lhspla-ci.org:8080/api/health 2>/dev/null || echo "000")

if [ "$STG_STATUS" != "200" ]; then
  echo "❌ Staging non disponible (HTTP $STG_STATUS) — déploiement prod annulé"
  exit 1
fi
echo "✅ Staging OK (HTTP $STG_STATUS)"

echo "▶ [Prod] Pull des nouvelles images..."
docker compose -f docker-compose.prod.yml --env-file .env.prod pull

echo "▶ [Prod] Démarrage des containers..."
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans

echo "▶ [Prod] Seed initial (idempotent)..."
sleep 10
docker exec prod-api sh -c "npx ts-node prisma/seed.ts" 2>/dev/null || true

echo "▶ [Prod] Health check (port 443)..."
PROD_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  https://vps.lhspla-ci.org/api/health 2>/dev/null || echo "000")

if [ "$PROD_STATUS" != "200" ]; then
  echo "❌ [Prod] Health check échoué (HTTP $PROD_STATUS)"
  exit 1
fi
echo "✅ [Prod] Déploiement réussi — https://vps.lhspla-ci.org"

docker image prune -f --filter "until=24h" 2>/dev/null || true
