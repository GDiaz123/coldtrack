import type { PrismaClient } from "@/app/generated/prisma/client";

export const defaultPlans = [
  { code: "STARTER" as const, name: "Starter", maxSensors: 12, priceMonthlyUsd: 99 },
  { code: "PRO" as const, name: "Professional", maxSensors: 60, priceMonthlyUsd: 299 },
  { code: "ENTERPRISE" as const, name: "Enterprise", maxSensors: 300, priceMonthlyUsd: 899 },
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
