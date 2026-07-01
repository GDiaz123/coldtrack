import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
  const auth = companyId
    ? await requireAuth({ companyId, companyRoles: ["ADMIN", "SUPERVISOR"] })
    : await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const repo = await getColdtrackRepository();
  const userList = await repo.listUsers(companyId);
  return Response.json(userList);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, name, email, role, status } = body;
    const auth = companyId
      ? await requireAuth({ companyId, companyRoles: ["ADMIN"] })
      : await requireAuth({ roles: ["SUPER_ADMIN"] });
    if (!auth.ok) return auth.response;

    if (!name || !email || !role) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (auth.user.role !== "SUPER_ADMIN") {
      if (role === "SUPER_ADMIN" || companyId !== auth.user.companyId) {
        return Response.json({ error: "FORBIDDEN_ROLE" }, { status: 403 });
      }
    }

    const repo = await getColdtrackRepository();
    const user = await repo.createUser({
      companyId: companyId ?? null,
      name,
      email,
      role,
      status: status ?? "INVITED",
    });

    logger.info("user_created", { userId: user.id, name, role });
    return Response.json(user, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("user_create_failed", { error: message });
    return Response.json({ error: message }, { status: 400 });
  }
}
