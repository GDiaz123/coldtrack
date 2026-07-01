import { Signer } from "@aws-sdk/rds-signer";
import pg from "pg";
import { awsConfig } from "@/lib/server/aws-config";

const TOKEN_TTL_MS = 12 * 60 * 1000;

let cachedPool: pg.Pool | null = null;
let poolCreatedAt = 0;

export async function getRdsAuthToken() {
  const signer = new Signer({
    hostname: awsConfig.rdsHost,
    port: awsConfig.rdsPort,
    username: awsConfig.rdsUser,
    region: awsConfig.region,
  });
  return signer.getAuthToken();
}

export async function getPgPoolConfig(): Promise<pg.PoolConfig> {
  if (awsConfig.rdsIamAuth) {
    const token = await getRdsAuthToken();
    return {
      host: awsConfig.rdsHost,
      port: awsConfig.rdsPort,
      user: awsConfig.rdsUser,
      password: token,
      database: awsConfig.rdsDatabase,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL or RDS_IAM_AUTH is required");
  }

  const needsSsl =
    process.env.RDS_SSL === "true" ||
    connectionString.includes("rds.amazonaws.com") ||
    connectionString.includes("sslmode=require");

  return {
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
  };
}

export async function getPgPool() {
  const now = Date.now();
  const expired = cachedPool && now - poolCreatedAt > TOKEN_TTL_MS;

  if (cachedPool && !expired) {
    return cachedPool;
  }

  if (cachedPool) {
    await cachedPool.end().catch(() => undefined);
    cachedPool = null;
  }

  const config = await getPgPoolConfig();
  cachedPool = new pg.Pool(config);
  poolCreatedAt = now;
  return cachedPool;
}

export async function resetPgPool() {
  if (cachedPool) {
    await cachedPool.end().catch(() => undefined);
    cachedPool = null;
  }
  poolCreatedAt = 0;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL) || awsConfig.rdsIamAuth;
}
