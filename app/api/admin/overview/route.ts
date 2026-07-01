import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";

export async function GET() {
  const repo = await getColdtrackRepository();
  const overview = await repo.getAdminOverview();
  logger.info("admin_overview_requested", {
    companies: overview.stats.companies,
    sensors: overview.stats.sensors,
  });

  return Response.json(overview);
}
