import "dotenv/config";
import { prisma } from "../lib/prisma.js";

try {
  const result = await prisma.accountSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.info(`Removed ${result.count} expired account session(s).`);
} catch (error) {
  console.error("Expired account-session cleanup failed:", error?.message || "Unknown error");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => {});
}
