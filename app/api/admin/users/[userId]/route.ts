import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import type { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const repo = await getColdtrackRepository();

  const body = await request.json();
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
  const deleted = await repo.deleteUser(userId);

  if (!deleted) {
    return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
  }

  logger.info("user_deleted", { userId });
  return Response.json({ ok: true });
}
