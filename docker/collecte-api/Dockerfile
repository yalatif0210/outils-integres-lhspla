FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY collecte-api/package*.json ./
RUN npm install --legacy-peer-deps

COPY collecte-api/ .
RUN DATABASE_URL=postgresql://x:x@localhost:5432/x npx prisma generate
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./

COPY docker/collecte-api/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["/entrypoint.sh"]
