import { getJwtSecret } from "@/lib/server/auth";
import { isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { findUserById, toAppUser } from "@/lib/server/user-service";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export async function GET() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");

  if (!tokenCookie) {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(tokenCookie.value, getJwtSecret()) as {
      userId: string;
      email: string;
      role: string;
      companyId: string | null;
    };

    if (isDatabaseConfigured() && (await isDatabaseAvailable())) {
      const dbUser = await findUserById(payload.userId);
      if (!dbUser) {
        return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
      }
      return Response.json({ ok: true, user: await toAppUser(dbUser) });
    }

    const repo = await getColdtrackRepository();
    const user = await repo.getUser(payload.userId);

    if (!user) {
      return Response.json({ error: "USER_NOT_FOUND" }, { status: 404 });
    }

    return Response.json({ ok: true, user });
  } catch {
    return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
