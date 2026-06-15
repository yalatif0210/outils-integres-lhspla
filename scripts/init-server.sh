#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# init-server.sh — Initialisation du serveur VPS (Ubuntu 22.04)
# À exécuter UNE SEULE FOIS sur le serveur cible, en root ou sudo
# Usage : sudo bash init-server.sh
#
# Architecture SSL :
#   nginx SYSTÈME (ports 80/443) → certbot SYSTÈME
#   prod-frontend Docker exposé sur 127.0.0.1:8090 uniquement
#   Pas de Docker nginx : le VPS peut être partagé avec d'autres applis
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="vps.lhspla-ci.org"
EMAIL="admin@lhspla.ci"
APP_DIR="/home/markov/lhspla"
ACME_ROOT="/var/www/certbot"

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

# ── 3. Nginx système + Certbot ────────────────────────────────────────────────
echo "▶ Installation nginx système + certbot..."
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx : $(nginx -v 2>&1 | tr -d '\n')"

# ── 4. Réseaux Docker ─────────────────────────────────────────────────────────
echo "▶ Création des réseaux Docker..."
docker network create lhspla-prod-net 2>/dev/null || echo "  lhspla-prod-net déjà présent"
docker network create lhspla-stg-net  2>/dev/null || echo "  lhspla-stg-net déjà présent"

# ── 5. Fichiers .env ──────────────────────────────────────────────────────────
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

# ── 6. Config nginx HTTP (ACME challenge uniquement) ─────────────────────────
echo "▶ Config nginx HTTP pour ACME challenge..."
mkdir -p "$ACME_ROOT"

cat > /etc/nginx/sites-available/lhspla <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root $ACME_ROOT;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}
EOF

ln -sf /etc/nginx/sites-available/lhspla /etc/nginx/sites-enabled/lhspla
# Désactiver le vhost default si présent (évite conflit port 80)
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx HTTP activé — ACME challenge prêt"

# ── 7. Certificat Let's Encrypt ───────────────────────────────────────────────
echo "▶ Obtention du certificat SSL pour $DOMAIN..."
certbot certonly --webroot -w "$ACME_ROOT" \
  --email "$EMAIL" --agree-tos --no-eff-email \
  -d "$DOMAIN"
echo "✅ Certificat obtenu"

# ── 8. Config nginx HTTPS (proxy → prod-frontend:8090) ───────────────────────
echo "▶ Activation config nginx HTTPS..."
cp "$APP_DIR/docker/nginx-system/lhspla.conf" /etc/nginx/sites-available/lhspla
nginx -t && systemctl reload nginx
echo "✅ Nginx HTTPS actif — https://$DOMAIN"

# ── 9. Renouvellement SSL automatique ─────────────────────────────────────────
echo "▶ Cron renouvellement SSL..."
echo "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" \
  > /etc/cron.d/certbot-lhspla
echo "✅ Cron certbot configuré (3h00 quotidien)"

# ── 10. Infrastructure Docker (Portainer, pgAdmin, n8n) ──────────────────────
echo "▶ Démarrage infrastructure Docker..."
docker compose -f docker-compose.infra.yml --env-file .env.prod up -d
echo "✅ Infrastructure démarrée"

# ── 11. Premier déploiement staging ──────────────────────────────────────────
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
