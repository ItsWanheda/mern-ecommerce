import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
const queryLoggingEnabled = process.env.PRISMA_QUERY_LOGGING === "true";

export const prisma = globalForPrisma.prismaClient ?? new PrismaClient({
  log: queryLoggingEnabled ? ["warn", "error", "query"] : ["warn", "error"],
});

// Reuse a single Prisma Client during local development and warm serverless invocations.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaClient = prisma;
}

export const connectPostgres = async () => {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  return true;
};

export const disconnectPostgres = async () => prisma.$disconnect();

export default prisma;
