import { getPrisma } from "@/lib/server/db";
import { isDatabaseConfigured } from "@/lib/server/rds-connection";
import { logger } from "@/lib/server/logger";

let cachedAvailability: { ok: boolean; checkedAt: number } | null = null;
const CACHE_TTL_MS = 15_000;
const DEFAULT_HEALTH_TIMEOUT_MS = 4_000;

function getHealthTimeoutMs() {
  const configured = Number(process.env.DB_HEALTH_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_HEALTH_TIMEOUT_MS;
}

export async function isDatabaseAvailable() {
  if (!isDatabaseConfigured()) return false;

  const now = Date.now();
  if (cachedAvailability && now - cachedAvailability.checkedAt < CACHE_TTL_MS) {
    return cachedAvailability.ok;
  }

  try {
    const prisma = await getPrisma();
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("DATABASE_HEALTH_TIMEOUT")), getHealthTimeoutMs());
      }),
    ]);
    cachedAvailability = { ok: true, checkedAt: now };
    return true;
  } catch (error) {
    cachedAvailability = { ok: false, checkedAt: now };
    const message = error instanceof Error ? error.message : "UNKNOWN_DB_ERROR";
    logger.warn("database_unavailable", { message });
    return false;
  }
}

export function getDatabaseSetupHint() {
  return [
    "PostgreSQL no está disponible. Opciones:",
    "1) Instale Docker Desktop y ejecute: docker compose up db -d",
    "2) Luego: npm run db:push && npm run db:seed",
    "3) O comente DATABASE_URL en .env para usar modo demo sin base de datos.",
  ].join(" ");
}

export function resetDatabaseAvailabilityCache() {
  cachedAvailability = null;
}
