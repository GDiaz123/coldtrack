import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function GET() {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();
  const companies = await repo.listCompanies();
  return Response.json(companies);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();

  try {
    const body = await request.json();
    const { name, ruc, status, plan, contactEmail, alertPhone, registrationKey } = body;

    if (!name || !ruc || !contactEmail) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    const company = await repo.createCompany({
      name,
      ruc,
      status: status ?? "TRIAL",
      plan: plan ?? "STARTER",
      contactEmail,
      alertPhone: alertPhone ?? null,
      registrationKey: registrationKey ? String(registrationKey).trim().toUpperCase() : undefined,
    });

    logger.info("company_created", { companyId: company.id, name });
    return Response.json(company, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("company_create_failed", { error: message });
    return Response.json({ error: message }, { status: 400 });
  }
}
