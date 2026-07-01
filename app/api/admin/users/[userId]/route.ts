import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { requireAuth } from "@/lib/server/request-auth";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const repo = await getColdtrackRepository();
  const target = await repo.getUser(userId);

  if (!target) {
    return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const auth = target.companyId
    ? await requireAuth({ companyId: target.companyId, companyRoles: ["ADMIN"] })
    : await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  if (auth.user.role !== "SUPER_ADMIN") {
    if (
      body.role === "SUPER_ADMIN" ||
      (body.companyId !== undefined && body.companyId !== target.companyId)
    ) {
      return Response.json({ error: "FORBIDDEN_ROLE" }, { status: 403 });
    }
  }

  const updated = await repo.updateUser(userId, body);

  if (!updated) {
    return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  logger.info("user_updated", { userId });
  return Response.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const repo = await getColdtrackRepository();
  const target = await repo.getUser(userId);

  if (!target) {
    return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  const auth = target.companyId
    ? await requireAuth({ companyId: target.companyId, companyRoles: ["ADMIN"] })
    : await requireAuth({ roles: ["SUPER_ADMIN"] });
  if (!auth.ok) return auth.response;

  const deleted = await repo.deleteUser(userId);

  if (!deleted) {
    return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  logger.info("user_deleted", { userId });
  return Response.json({ ok: true });
}
