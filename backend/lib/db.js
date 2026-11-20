import { prisma, connectPostgres } from "./prisma.js";

let connectionPromise = null;

export const connectDB = async () => {
  if (!connectionPromise) {
    connectionPromise = connectPostgres().catch(error => {
      connectionPromise = null;
      throw error;
    });
  }
  try {
    await connectionPromise;
    // Recheck the live connection on each guarded API request. A previously
    // fulfilled connect promise must not mask a PostgreSQL outage.
    await prisma.$queryRaw`SELECT 1`;
    return prisma;
  } catch (error) {
    connectionPromise = null;
    throw error;
  }
};

export const disconnectDB = async () => {
  connectionPromise = null;
  await prisma.$disconnect();
};
