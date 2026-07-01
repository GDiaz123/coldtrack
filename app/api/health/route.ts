import { isAwsConfigured } from "@/lib/server/aws-config";
import { env } from "@/lib/server/env";
import { isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";

export async function GET() {
  const repository = await getColdtrackRepository();
  const overview = await repository.getAdminOverview();
  const dbConfigured = isDatabaseConfigured();
  const dbAvailable = dbConfigured ? await isDatabaseAvailable() : false;

  return Response.json({
    ok: true,
    app: env.appName,
    environment: env.nodeEnv,
    provider: env.sensorProvider,
    database: dbAvailable ? "postgresql" : dbConfigured ? "postgresql-unavailable" : "memory",
    aws: isAwsConfigured()
      ? { region: env.awsRegion, bucket: env.awsS3Bucket, configured: true }
      : { configured: false },
    companies: overview.stats.companies,
    sensors: overview.stats.sensors,
    checkedAt: new Date().toISOString(),
  });
}
