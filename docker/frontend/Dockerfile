# ── Stage 1: Build Angular ───────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY lhspla-bulletin/package*.json ./
RUN npm ci --legacy-peer-deps

COPY lhspla-bulletin/ .
RUN npm run build -- --configuration=production

# ── Stage 2: Serve avec nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine AS production

# Angular 17+ → dist/lhspla-bulletin/browser/
COPY --from=builder /app/dist/lhspla-bulletin/browser /usr/share/nginx/html

# Template nginx avec ${API_HOST} injecté au démarrage via envsubst
COPY docker/frontend/nginx.conf /etc/nginx/templates/default.conf.template

# API_HOST est le nom du container NestJS (stg-api ou prod-api)
ENV API_HOST=api
ENV COLLECTE_FRONT_HOST=collecte-front
ENV COLLECTE_API_HOST=collecte-api

EXPOSE 80

# Substitue les variables de service — les variables nginx ($host, $remote_addr…) restent intactes
CMD ["/bin/sh", "-c", "envsubst '${API_HOST} ${COLLECTE_FRONT_HOST} ${COLLECTE_API_HOST}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
