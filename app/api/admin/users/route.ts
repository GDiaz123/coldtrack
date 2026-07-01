import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
  const repo = await getColdtrackRepository();
  const userList = await repo.listUsers(companyId);
  return Response.json(userList);
}

export async function POST(request: NextRequest) {
  const repo = await getColdtrackRepository();

  try {
    const body = await request.json();
    const { companyId, name, email, role, status } = body;

    if (!name || !email || !role) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

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
