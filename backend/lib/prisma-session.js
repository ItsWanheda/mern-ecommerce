import { prisma } from "./prisma.js";

/** PostgreSQL transaction wrapper used by checkout, stock and coupon workflows. */
export const startPrismaSession = () => {
  const session = {
    transaction: null,
    async withTransaction(callback) {
      let attempts = 0;
      while (true) {
        try {
          return await prisma.$transaction(async tx => {
            session.transaction = tx;
            try { return await callback(tx); }
            finally { session.transaction = null; }
          }, {
            isolationLevel: "Serializable",
            maxWait: 10000,
            timeout: 20000,
          });
        } catch (error) {
          // A serialization conflict retries the complete callback, which re-reads
          // inventory/coupon counters before attempting another write.
          session.transaction = null;
          if (error?.code !== "P2034" || attempts >= 2) throw error;
          attempts += 1;
        }
      }
    },
    async endSession() { session.transaction = null; },
  };
  return session;
};
