# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY collecte-api/package*.json ./
COPY collecte-api/prisma ./prisma
RUN npm install --legacy-peer-deps

COPY collecte-api/ .
RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-slim AS runner

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/prisma       ./prisma
COPY --from=builder /app/package.json ./

COPY docker/collecte-api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
