import "dotenv/config";
import { getPrisma } from "../lib/server/db";
import { hashPassword } from "../lib/server/auth";

async function main() {
  const prisma = await getPrisma();
  const passwordHash = await hashPassword("password123");

  const plans = [
    { code: "STARTER" as const, name: "Basico", maxSensors: 8, priceMonthlyUsd: 1200, currency: "PEN" },
    { code: "PRO" as const, name: "Premium", maxSensors: 40, priceMonthlyUsd: 1600, currency: "USD" },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }

  const companies = [
    {
      id: "empresa-a",
      name: "Clínica Santa Aurora",
      ruc: "20601845190",
      status: "ACTIVE" as const,
      plan: "PRO" as const,
      contactEmail: "operaciones@santaaurora.pe",
      alertPhone: "+51900111222",
      registrationKey: "AURORA-2026",
      createdAt: new Date("2026-02-12T14:20:00.000Z"),
    },
    {
      id: "empresa-b",
      name: "Laboratorio BioNorte",
      ruc: "20577110233",
      status: "TRIAL" as const,
      plan: "STARTER" as const,
      contactEmail: "calidad@bionorte.pe",
      alertPhone: "+51900333444",
      registrationKey: "BIONORTE-2026",
      createdAt: new Date("2026-05-04T09:15:00.000Z"),
    },
    {
      id: "empresa-c",
      name: "Banco de Sangre VitalRed",
      ruc: "20490244718",
      status: "ACTIVE" as const,
      plan: "PRO" as const,
      contactEmail: "monitoreo@vitalred.pe",
      alertPhone: "+51900555666",
      registrationKey: "VITALRED-2026",
      createdAt: new Date("2025-11-18T12:40:00.000Z"),
    },
  ];

  for (const company of companies) {
    await prisma.company.upsert({
      where: { id: company.id },
      update: company,
      create: company,
    });
  }

  const users = [
    {
      id: "u-1",
      companyId: null,
      name: "Sebastian Admin",
      email: "admin@coldtrack.ai",
      role: "SUPER_ADMIN" as const,
      status: "ACTIVE" as const,
    },
    {
      id: "u-2",
      companyId: "empresa-a",
      name: "Dra. Valeria Ríos",
      email: "valeria@santaaurora.pe",
      role: "SUPERVISOR" as const,
      status: "ACTIVE" as const,
    },
    {
      id: "u-3",
      companyId: "empresa-a",
      name: "Miguel Torres",
      email: "miguel@santaaurora.pe",
      role: "TECHNICIAN" as const,
      status: "ACTIVE" as const,
    },
    {
      id: "u-4",
      companyId: "empresa-b",
      name: "Andrea Salas",
      email: "andrea@bionorte.pe",
      role: "AUDITOR" as const,
      status: "INVITED" as const,
    },
    {
      id: "u-5",
      companyId: "empresa-c",
      name: "Luis Paredes",
      email: "luis@vitalred.pe",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { ...user, passwordHash },
      create: { ...user, passwordHash },
    });
  }

  console.log("Seed completado: planes, empresas y usuarios demo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const prisma = await getPrisma();
    await prisma.$disconnect();
  });
