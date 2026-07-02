#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
DB_HOST="${DB_HOST:-db}"
DB_PORT="${DB_PORT:-5432}"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-60}"
elapsed=0

until nc -z "$DB_HOST" "$DB_PORT"; do
  elapsed=$((elapsed + 2))
  if [ "$elapsed" -ge "$DB_WAIT_TIMEOUT" ]; then
    echo "PostgreSQL was not available after ${DB_WAIT_TIMEOUT}s."
    exit 1
  fi
  sleep 2
done

echo "PostgreSQL is available at ${DB_HOST}:${DB_PORT}."

echo "Applying Prisma schema..."
attempt=1
until npx prisma db push; do
  if [ "$attempt" -ge 5 ]; then
    echo "Could not apply Prisma schema after ${attempt} attempts."
    exit 1
  fi
  attempt=$((attempt + 1))
  echo "Retrying prisma db push (${attempt}/5)..."
  sleep 3
done

npx prisma generate

if [ "$RUN_DEMO_SEED" = "true" ]; then
  echo "Running demo seed..."
  npx tsx prisma/seed.ts || echo "Seed skipped or already applied."
else
  echo "Demo seed skipped. Set RUN_DEMO_SEED=true only for demo or staging."
fi

echo "Starting application..."
exec npm run start
