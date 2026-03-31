import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL ?? "";
  const sep = baseUrl.includes("?") ? "&" : "?";
  return new PrismaClient({
    datasources: {
      db: { url: `${baseUrl}${sep}connect_timeout=30&pool_timeout=30` },
    },
  });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
