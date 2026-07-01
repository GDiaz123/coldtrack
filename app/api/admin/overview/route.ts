import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";

export async function GET() {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();
  const overview = await repo.getAdminOverview();
  logger.info("admin_overview_requested", {
    companies: overview.stats.companies,
    sensors: overview.stats.sensors,
  });

  return Response.json(overview);
}
