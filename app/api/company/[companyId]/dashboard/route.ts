import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const auth = await requireAuth({ companyId });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();
  const dashboard = await repo.getCompanyDashboard(companyId);

  if (!dashboard) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  logger.info("company_dashboard_requested", { companyId, sensors: dashboard.sensors.length });
  return Response.json(dashboard);
}
