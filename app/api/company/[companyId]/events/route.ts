import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  const repo = await getColdtrackRepository();

  if (!(await repo.getCompany(companyId))) {
    return Response.json({ error: "COMPANY_NOT_FOUND" }, { status: 404 });
  }

  const limit = Number(request.nextUrl.searchParams.get("limit")) || 20;
  const events = await repo.getEvents(companyId, limit);
  return Response.json(events);
}
