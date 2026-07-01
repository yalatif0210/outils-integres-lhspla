FROM node:20-slim AS builder
WORKDIR /app

COPY collecte-front/package*.json ./
RUN npm install --legacy-peer-deps

COPY collecte-front/ .
RUN npm run build:prod

# ── Runtime Nginx ─────────────────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist/collecte-front/browser /usr/share/nginx/html
COPY docker/collecte-front/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
