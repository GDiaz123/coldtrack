#!/bin/sh
set -e

echo "Aplicando esquema de base de datos..."
npx prisma db push
npx prisma generate

echo "Ejecutando seed de datos demo..."
npx tsx prisma/seed.ts || echo "Seed omitido o ya aplicado."

echo "Iniciando aplicación..."
exec npm run start
