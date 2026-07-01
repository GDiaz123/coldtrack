import { getJwtSecret, verifyPassword } from "@/lib/server/auth";
import { isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured, isDatabaseDisabled } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { findUserByEmail, toAppUser } from "@/lib/server/user-service";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";

    if (!normalizedEmail || !password) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    let user;
    const databaseConfigured = isDatabaseConfigured();
    const databaseAvailable = databaseConfigured ? await isDatabaseAvailable() : false;

    if (databaseConfigured && !databaseAvailable) {
      return Response.json({ error: "DATABASE_UNAVAILABLE" }, { status: 503 });
    }

    if (process.env.NODE_ENV === "production" && !databaseConfigured && !isDatabaseDisabled()) {
      return Response.json({ error: "DATABASE_REQUIRED" }, { status: 503 });
    }

    if (databaseConfigured) {
      const dbUser = await findUserByEmail(normalizedEmail);
      if (!dbUser) {
        return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
      }

      const valid = await verifyPassword(password, dbUser.passwordHash);
      if (!valid) {
        return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
      }

      if (dbUser.status === "DISABLED") {
        return Response.json({ error: "USER_DISABLED" }, { status: 403 });
      }

      user = await toAppUser(dbUser);
    } else {
      const repo = await getColdtrackRepository();
      const memoryUser = (await repo.listUsers()).find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!memoryUser || password !== "password123") {
        return Response.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
      }

      if (memoryUser.status === "DISABLED") {
        return Response.json({ error: "USER_DISABLED" }, { status: 403 });
      }

      user = memoryUser;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      getJwtSecret(),
      { expiresIn: "1d" }
    );

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
      path: "/",
      sameSite: "lax",
    });

    logger.info("user_logged_in", { userId: user.id, email: user.email, role: user.role });

    return Response.json({ ok: true, user });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("login_failed", { error: message });
    return Response.json({ error: message }, { status: 500 });
  }
}
