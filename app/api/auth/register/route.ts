import { getJwtSecret } from "@/lib/server/auth";
import { getDatabaseSetupHint, isDatabaseAvailable } from "@/lib/server/database-health";
import { isDatabaseConfigured, isDatabaseDisabled } from "@/lib/server/rds-connection";
import { getColdtrackRepository } from "@/lib/server/coldtrack-store";
import { logger } from "@/lib/server/logger";
import { registerOrganization, registerWorker, toAppUser } from "@/lib/server/user-service";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, companyName, ruc, contactEmail, registrationKey } = body;
    const mode = body.mode === "worker" ? "worker" : "company";

    if (!name || !email || !password) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (mode === "company" && (!companyName || !ruc || !contactEmail)) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (mode === "worker" && !registrationKey) {
      return Response.json({ error: "MISSING_FIELDS" }, { status: 400 });
    }

    if (password.length < 8) {
      return Response.json({ error: "WEAK_PASSWORD", message: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }

    let user;
    const databaseConfigured = isDatabaseConfigured();
    const databaseAvailable = databaseConfigured ? await isDatabaseAvailable() : false;
    const shouldUseDatabase = databaseConfigured && databaseAvailable;

    if (databaseConfigured && !databaseAvailable) {
      logger.warn("register_database_unavailable_memory_fallback", {
        environment: process.env.NODE_ENV ?? "development",
      });
    }

    if (
      process.env.NODE_ENV === "production" &&
      !shouldUseDatabase &&
      !isDatabaseDisabled() &&
      process.env.ALLOW_MEMORY_FALLBACK !== "true"
    ) {
      return Response.json(
        {
          error: "DATABASE_REQUIRED",
          message: "Configure una base PostgreSQL remota o use DATABASE_DISABLED=true para modo demo.",
          hint: getDatabaseSetupHint(),
        },
        { status: 503 }
      );
    }

    if (!shouldUseDatabase) {
      const repo = await getColdtrackRepository();
      if (mode === "worker") {
        const companies = await repo.listCompanies();
        const company = companies.find(
          (item) => item.registrationKey?.toUpperCase() === String(registrationKey).trim().toUpperCase()
        );
        if (!company || company.status === "SUSPENDED") {
          return Response.json(
            { error: "INVALID_REGISTRATION_KEY", message: "La clave de empresa no es valida." },
            { status: 403 }
          );
        }

        user = await repo.createUser({
          companyId: company.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "SUPERVISOR",
          status: "ACTIVE",
        });
      } else {
        const company = await repo.createCompany({
          name: companyName.trim(),
          ruc: ruc.trim(),
          status: "TRIAL",
          plan: "STARTER",
          contactEmail: contactEmail.trim().toLowerCase(),
          alertPhone: null,
        });

        user = await repo.createUser({
          companyId: company.id,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "ADMIN",
          status: "ACTIVE",
        });
      }
    } else if (mode === "worker") {
      user = await registerWorker({
        name,
        email,
        password,
        registrationKey,
      });
    } else {
      user = await registerOrganization({
        name,
        email,
        password,
        companyName,
        ruc,
        contactEmail,
      });
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

    if (message === "INVALID_REGISTRATION_KEY") {
      return Response.json(
        { error: message, detail: "La clave de empresa no es valida o la empresa esta suspendida." },
        { status: 403 }
      );
    }

    return Response.json({ error: message }, { status: 400 });
  }
}
