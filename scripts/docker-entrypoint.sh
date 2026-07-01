#!/bin/sh
set -e

echo "Aplicando esquema de base de datos..."
npx prisma db push
npx prisma generate

if [ "$RUN_DEMO_SEED" = "true" ]; then
  echo "Ejecutando seed de datos demo..."
  npx tsx prisma/seed.ts || echo "Seed omitido o ya aplicado."
else
  echo "Seed demo omitido. Defina RUN_DEMO_SEED=true solo para demo o staging."
fi

echo "Iniciando aplicación..."
exec npm run start
