#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# setup-nginx-system.sh — Configure le nginx SYSTÈME pour la production
# Appelé par le workflow production.yml (step "Configurer nginx système + SSL")
# Idempotent : détecte ce qui est déjà fait et saute les étapes inutiles
#
# Architecture :
#   nginx SYSTÈME (443 SSL) → proxy http://127.0.0.1:8090 → prod-frontend Docker
#   VPS partagé : pas de Docker nginx (conflit port 80/443 avec nginx système)
# ─────────────────────────────────────────────────────────────────────────────
set -e

DOMAIN="vps.lhspla-ci.org"
EMAIL="admin@lhspla.ci"
APP_DIR="/home/markov/lhspla"
ACME_ROOT="/var/www/certbot"

echo "══════════════════════════════════════════════"
echo "  LHSPLA — Setup nginx système + SSL"
echo "══════════════════════════════════════════════"

if [ ! -f "$APP_DIR/docker/nginx-system/lhspla.conf" ]; then
  echo "❌ $APP_DIR/docker/nginx-system/lhspla.conf introuvable"
  echo "   Vérifiez que le repo est à jour sur le VPS"
  exit 1
fi

# ── 1. Nginx système + Certbot ────────────────────────────────────────────────
if ! command -v nginx &> /dev/null; then
  echo "▶ Installation nginx..."
  apt-get update -qq && apt-get install -y nginx
fi
if ! command -v certbot &> /dev/null; then
  echo "▶ Installation certbot..."
  apt-get update -qq && apt-get install -y certbot python3-certbot-nginx
fi
systemctl enable nginx
systemctl start nginx || true
echo "✅ Nginx : $(nginx -v 2>&1 | tr -d '\n')"

# ── 2. Config nginx HTTP (ACME challenge) — si site non encore activé ─────────
mkdir -p "$ACME_ROOT"

if [ ! -f /etc/nginx/sites-enabled/lhspla ]; then
  echo "▶ Activation vhost HTTP pour ACME challenge..."
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
  # Pas besoin de retirer le vhost default : nginx route par server_name,
  # les autres domaines du VPS restent inchangés.
  nginx -t && systemctl reload nginx
  echo "✅ Vhost HTTP lhspla activé"
else
  echo "✅ Vhost lhspla déjà activé dans sites-enabled"
fi

# ── 3. Certificat Let's Encrypt ───────────────────────────────────────────────
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  echo "✅ Certificat SSL déjà présent"
else
  echo "▶ Obtention certificat SSL pour $DOMAIN..."
  certbot certonly --webroot -w "$ACME_ROOT" \
    --email "$EMAIL" --agree-tos --no-eff-email \
    -d "$DOMAIN"
  echo "✅ Certificat obtenu"
fi

# ── 4. Fichiers SSL requis par la config nginx ────────────────────────────────
# options-ssl-nginx.conf et ssl-dhparams.pem ne sont pas créés par
# "certbot certonly --webroot" — on les télécharge si absents.
if [ ! -f /etc/letsencrypt/options-ssl-nginx.conf ]; then
  echo "▶ Téléchargement options-ssl-nginx.conf..."
  curl -fsSL \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
fi
if [ ! -f /etc/letsencrypt/ssl-dhparams.pem ]; then
  echo "▶ Téléchargement ssl-dhparams.pem..."
  curl -fsSL \
    https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
    -o /etc/letsencrypt/ssl-dhparams.pem
fi

# ── 5. Config nginx HTTPS (proxy → prod-frontend 127.0.0.1:8090) ─────────────
echo "▶ Déploiement config nginx HTTPS..."
cp "$APP_DIR/docker/nginx-system/lhspla.conf" /etc/nginx/sites-available/lhspla
nginx -t && systemctl reload nginx
echo "✅ Nginx HTTPS actif — https://$DOMAIN → 127.0.0.1:8090"

# ── 6. Renouvellement SSL automatique ─────────────────────────────────────────
if [ ! -f /etc/cron.d/certbot-lhspla ]; then
  echo "▶ Cron renouvellement SSL..."
  echo "0 3 * * * root certbot renew --quiet --post-hook 'systemctl reload nginx'" \
    > /etc/cron.d/certbot-lhspla
  echo "✅ Cron certbot configuré"
fi

echo ""
echo "══════════════════════════════════════════════"
echo "  ✅ Nginx système configuré"
echo "  🌐 https://$DOMAIN → 127.0.0.1:8090"
echo "══════════════════════════════════════════════"
