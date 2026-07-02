import { getPrisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import { ensureDefaultPlans } from "@/lib/server/default-plans";
import type { UserRole } from "@/app/generated/prisma/client";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  ruc: string;
  contactEmail: string;
};

export type RegisterWorkerInput = {
  name: string;
  email: string;
  password: string;
  registrationKey: string;
};

function generateRegistrationKey(name: string) {
  const prefix =
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "EMPRESA";
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function registerOrganization(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const ruc = input.ruc.trim();

  const prisma = await getPrisma();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const existingRuc = await prisma.company.findUnique({ where: { ruc } });
  if (existingRuc) {
    throw new Error("RUC_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const result = await prisma.$transaction(async (tx) => {
    await ensureDefaultPlans(tx as unknown as Parameters<typeof ensureDefaultPlans>[0]);

    const company = await tx.company.create({
      data: {
        name: input.companyName.trim(),
        ruc,
        status: "TRIAL",
        plan: "STARTER",
        contactEmail: input.contactEmail.trim().toLowerCase(),
        alertPhone: null,
        registrationKey: generateRegistrationKey(input.companyName),
      },
    });

    const user = await tx.user.create({
      data: {
        companyId: company.id,
        name: input.name.trim(),
        email,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });

    return { company, user };
  });

  return {
    id: result.user.id,
    companyId: result.company.id,
    name: result.user.name,
    email: result.user.email,
    role: result.user.role as UserRole,
    status: result.user.status,
  };
}

export async function registerWorker(input: RegisterWorkerInput) {
  const email = input.email.trim().toLowerCase();
  const key = input.registrationKey.trim().toUpperCase();

  const prisma = await getPrisma();
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const company = await prisma.company.findFirst({
    where: {
      registrationKey: key,
      status: { not: "SUSPENDED" },
    },
  });
  if (!company) {
    throw new Error("INVALID_REGISTRATION_KEY");
  }

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      role: "SUPERVISOR",
      status: "ACTIVE",
    },
  });

  return {
    id: user.id,
    companyId: company.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    status: user.status,
  };
}

export async function findUserByEmail(email: string) {
  const prisma = await getPrisma();
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    include: { company: true },
  });
}

export async function findUserById(userId: string) {
  const prisma = await getPrisma();
  return prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });
}

export async function toAppUser(user: {
  id: string;
  companyId: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
}) {
  return {
    id: user.id,
    companyId: user.companyId,
    name: user.name,
    email: user.email,
    role: user.role as import("@/lib/domain/coldtrack").UserRole,
    status: user.status as "ACTIVE" | "INVITED" | "DISABLED",
  };
}
