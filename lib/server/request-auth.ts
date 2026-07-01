import { getJwtSecret } from "@/lib/server/auth";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured } from "@/lib/server/rds-connection";
import { findUserById, toAppUser } from "@/lib/server/user-service";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { AppUser, UserRole } from "@/lib/domain/coldtrack";

type AuthResult =
  | { ok: true; user: AppUser }
  | { ok: false; response: Response };

type RequireAuthOptions = {
  roles?: UserRole[];
  companyId?: string;
  companyRoles?: UserRole[];
};

function deny(error: string, status: number) {
  return { ok: false as const, response: Response.json({ error }, { status }) };
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("token");

  if (!tokenCookie) return null;

  try {
    const payload = jwt.verify(tokenCookie.value, getJwtSecret()) as {
      userId: string;
    };

    if (isDatabaseConfigured() && (await isDatabaseAvailable())) {
      const dbUser = await findUserById(payload.userId);
      if (!dbUser || dbUser.status === "DISABLED") return null;
      return toAppUser(dbUser);
    }

    const repo = await getColdtrackRepository();
    const user = await repo.getUser(payload.userId);
    if (!user || user.status === "DISABLED") return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireAuth(options: RequireAuthOptions = {}): Promise<AuthResult> {
  const user = await getCurrentUser();

  if (!user) {
    return deny("UNAUTHORIZED", 401);
  }

  if (options.roles && !options.roles.includes(user.role)) {
    return deny("FORBIDDEN", 403);
  }

  if (options.companyId && user.role !== "SUPER_ADMIN") {
    if (user.companyId !== options.companyId) {
      return deny("FORBIDDEN_COMPANY", 403);
    }

    if (options.companyRoles && !options.companyRoles.includes(user.role)) {
      return deny("FORBIDDEN_ROLE", 403);
    }
  }

  return { ok: true, user };
}
