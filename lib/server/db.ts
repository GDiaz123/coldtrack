import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getPgPool, isDatabaseConfigured, resetPgPool } from "@/lib/server/rds-connection";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaInit?: Promise<PrismaClient>;
};

async function createPrismaClient() {
  const pool = await getPgPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export async function getPrisma() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  if (!globalForPrisma.prismaInit) {
    globalForPrisma.prismaInit = createPrismaClient().then((client) => {
      globalForPrisma.prisma = client;
      return client;
    });
  }

  return globalForPrisma.prismaInit;
}

export async function resetPrismaClient() {
  await resetPgPool();
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect().catch(() => undefined);
  }
  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaInit = undefined;
}

export { isDatabaseConfigured };
