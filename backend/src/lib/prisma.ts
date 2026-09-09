import { PrismaClient } from "@prisma/client";

// Singleton so we don't exhaust DB connections with hot-reload in dev.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
