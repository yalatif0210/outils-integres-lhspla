#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# init-server.sh — Initialisation du serveur VPS (Ubuntu 22.04)
# À exécuter UNE SEULE FOIS sur le serveur cible
# Usage : bash init-server.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="vps.lhspla-ci.org"
EMAIL="admin@lhspla.ci"
APP_DIR="/home/markov/lhspla"

echo "══════════════════════════════════════════════"
echo "  LHSPLA — Initialisation serveur"
echo "  APP_DIR : $APP_DIR"
echo "══════════════════════════════════════════════"

# ── 1. Docker ─────────────────────────────────────────────────────────────────
if command -v docker &> /dev/null; then
  echo "✅ Docker déjà installé : $(docker --version)"
else
  echo "▶ Docker absent — installation en cours..."
  apt-get update -qq
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  usermod -aG docker "$USER" || true
  echo "✅ Docker installé : $(docker --version)"
fi

# ── 2. Docker Compose plugin ──────────────────────────────────────────────────
if docker compose version &> /dev/null; then
  echo "✅ Docker Compose déjà installé : $(docker compose version)"
else
  echo "▶ Docker Compose plugin absent — installation en cours..."
  apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installé : $(docker compose version)"
fi

# ── 3. Réseaux Docker ─────────────────────────────────────────────────────────
echo "▶ Création des réseaux Docker..."
docker network create lhspla-prod-net 2>/dev/null || echo "  lhspla-prod-net déjà présent"
docker network create lhspla-stg-net  2>/dev/null || echo "  lhspla-stg-net déjà présent"

# ── 4. Fichiers .env ──────────────────────────────────────────────────────────
cd "$APP_DIR"

if [ ! -f .env.prod ]; then
  echo ""
  echo "⚠️  Fichiers d'environnement manquants."
  echo "   Créez-les avant de continuer :"
  echo "   cp .env.prod.example .env.prod && nano .env.prod"
  echo "   cp .env.staging.example .env.staging && nano .env.staging"
  echo ""
  read -p "Appuyez sur Entrée quand les fichiers .env sont prêts..."
fi

# ── 5. Démarrer nginx HTTP (pour ACME challenge Certbot) ─────────────────────
echo "▶ Démarrage nginx en mode HTTP (pour obtenir le certificat SSL)..."
# Désactiver temporairement prod.conf (qui requiert SSL)
mv docker/nginx/conf.d/prod.conf docker/nginx/conf.d/prod.conf.disabled 2>/dev/null || true
docker compose -f docker-compose.infra.yml up -d nginx
sleep 3

# ── 6. Certificat Let's Encrypt — domaine principal uniquement ────────────────
echo "▶ Obtention du certificat SSL pour $DOMAIN..."
docker compose -f docker-compose.infra.yml run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"

# Fichiers requis par nginx SSL
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  curl -fsSL https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o /etc/letsencrypt/ssl-dhparams.pem
fi

# Réactiver prod.conf SSL
mv docker/nginx/conf.d/prod.conf.disabled docker/nginx/conf.d/prod.conf 2>/dev/null || true

# ── 7. Démarrer l'infrastructure complète ────────────────────────────────────
echo "▶ Démarrage de l'infrastructure..."
docker compose -f docker-compose.infra.yml --env-file .env.prod up -d

# ── 8. Premier déploiement staging ───────────────────────────────────────────
echo "▶ Premier déploiement staging..."
bash scripts/deploy-staging.sh

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Initialisation terminée !"
echo ""
echo "  🌐 Production : https://$DOMAIN"
echo "  🧪 Staging    : http://$DOMAIN:8080"
echo "  🐋 Portainer  : http://$DOMAIN:9000"
echo "  🗄️  pgAdmin   : http://$DOMAIN:5050"
echo "  ⚡ n8n        : http://$DOMAIN:5678"
echo "══════════════════════════════════════════════"
