import { isAwsConfigured } from "@/lib/server/aws-config";
import { env } from "@/lib/server/env";
import { isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured, isDatabaseDisabled } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";

export async function GET() {
  const dbConfigured = isDatabaseConfigured();
  const dbAvailable = dbConfigured ? await isDatabaseAvailable() : false;
  const memoryFallbackAllowed =
    isDatabaseDisabled() ||
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_MEMORY_FALLBACK === "true";
  const healthy = dbAvailable || memoryFallbackAllowed;
  const overview = healthy
    ? await (await getColdtrackRepository()).getAdminOverview()
    : null;

  return Response.json(
    {
      ok: healthy,
      app: env.appName,
      environment: env.nodeEnv,
      provider: env.sensorProvider,
      database: dbAvailable
        ? "postgresql"
        : dbConfigured
          ? "memory-fallback-postgresql-unavailable"
          : "memory",
      aws: isAwsConfigured()
        ? { region: env.awsRegion, bucket: env.awsS3Bucket, configured: true }
        : { configured: false },
      companies: overview?.stats.companies ?? null,
      sensors: overview?.stats.sensors ?? null,
      checkedAt: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
