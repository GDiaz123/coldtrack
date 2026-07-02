import type { PrismaClient } from "@/app/generated/prisma/client";

export const defaultPlans = [
  { code: "STARTER" as const, name: "Basico", maxSensors: 8, priceMonthlyUsd: 1200, currency: "PEN" },
  { code: "PRO" as const, name: "Premium", maxSensors: 40, priceMonthlyUsd: 1600, currency: "USD" },
];

export async function ensureDefaultPlans(prisma: PrismaClient) {
  for (const plan of defaultPlans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: plan,
      create: plan,
    });
  }
}
