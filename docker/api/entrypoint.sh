#!/bin/sh
set -e

echo "▶ Prisma migrate deploy..."
npx prisma migrate deploy

echo "▶ Démarrage NestJS..."
exec node dist/src/main
