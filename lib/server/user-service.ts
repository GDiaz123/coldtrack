import { getPrisma } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import type { UserRole } from "@/app/generated/prisma/client";

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  companyName: string;
  ruc: string;
  contactEmail: string;
};

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
    const company = await tx.company.create({
      data: {
        name: input.companyName.trim(),
        ruc,
        status: "TRIAL",
        plan: "STARTER",
        contactEmail: input.contactEmail.trim().toLowerCase(),
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
