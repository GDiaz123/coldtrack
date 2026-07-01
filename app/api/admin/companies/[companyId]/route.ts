import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  const body = await request.json();
  const updated = await repo.updateCompany(companyId, body);

  if (!updated) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  logger.info("company_updated", { companyId });
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const { companyId } = await params;
  const repo = await getColdtrackRepository();
  const deleted = await repo.deleteCompany(companyId);

  if (!deleted) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  logger.info("company_deleted", { companyId });
  return Response.json({ ok: true });
}
