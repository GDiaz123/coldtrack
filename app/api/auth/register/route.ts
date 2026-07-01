import { getJwtSecret } from "@/lib/server/auth";
import { getDatabaseSetupHint, isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { registerOrganization, toAppUser } from "@/lib/server/user-service";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return Response.json(
      {
        error: "DATABASE_REQUIRED",
        message: "Configure DATABASE_URL en .env para habilitar el registro.",
        hint: getDatabaseSetupHint(),
      },
      { status: 503 }
    );
  }

  if (!(await isDatabaseAvailable())) {
    return Response.json(
      {
        error: "DATABASE_UNAVAILABLE",
        message: "No se pudo conectar a PostgreSQL.",
        hint: getDatabaseSetupHint(),
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, password, companyName, ruc, contactEmail } = body;

    if (!name || !email || !password || !companyName || !ruc || !contactEmail) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "WEAK_PASSWORD", message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    const user = await registerOrganization({
      name,
      email,
      password,
      companyName,
      ruc,
      contactEmail,
    });

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

    logger.info("user_registered", { userId: user.id, email: user.email, companyId: user.companyId });

    return Response.json({ ok: true, user: await toAppUser(user) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
    logger.error("register_failed", { error: message });

    if (message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: message, detail: "Este correo ya está registrado." }, { status: 409 });
    }
    if (message === "RUC_ALREADY_EXISTS") {
      return Response.json({ error: message, detail: "Este RUC ya está registrado." }, { status: 409 });
    }

    return Response.json({ error: message }, { status: 400 });
  }
}
