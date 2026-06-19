# ── Stage 1: Build NestJS ────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Outils de compilation requis par bcrypt (node-gyp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY lhspla-api/package*.json ./
RUN npm ci --include=dev --legacy-peer-deps

COPY lhspla-api/ .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-slim AS production

# Python 3 + dépendances scripts (timeline, bulletin Excel) + curl pour healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-matplotlib \
      python3-numpy \
      python3-psycopg2 \
      python3-openpyxl \
      curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/dist            ./dist
COPY --from=builder /app/node_modules    ./node_modules
COPY --from=builder /app/package*.json   ./
COPY --from=builder /app/prisma          ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Scripts Python (timeline chart)
COPY lhspla-api/scripts/ ./scripts/

# Répertoires uploads créés à l'avance (montés en volume en prod)
RUN mkdir -p uploads/briefs uploads/missions uploads/tdr \
             uploads/budget-memos uploads/payment-proofs \
             uploads/payment-requests uploads/payment-template \
             uploads/recalls

# Script de démarrage : migrate puis start
COPY docker/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
