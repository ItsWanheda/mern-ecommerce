import { prisma } from "./prisma.js";

const waitForRedisReady = async (redisClient, timeoutMs = 6000) => {
  if (!redisClient) throw new Error("Redis client is not configured");
  if (redisClient.status === "ready" || typeof redisClient.once !== "function") return;
  if (redisClient.status === "end") throw new Error("Redis client connection has ended");
  await new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      redisClient.removeListener?.("ready", onReady);
      redisClient.removeListener?.("end", onEnd);
    };
    const finish = error => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onReady = () => finish();
    const onEnd = () => finish(new Error("Redis client connection ended before ready"));
    const timer = setTimeout(() => finish(new Error("Redis client did not become ready before timeout")), timeoutMs);
    redisClient.once("ready", onReady);
    redisClient.once("end", onEnd);
    if (redisClient.status === "ready") onReady();
  });
};

export const getReadinessStatus = async ({ databaseReady, redisClient, logger = console } = {}) => {
  let database = "disconnected";
  try {
    if (typeof databaseReady === "function") await databaseReady();
    else if (databaseReady !== true) await prisma.$queryRaw`SELECT 1`;
    database = "connected";
  } catch (error) {
    logger.warn?.("PostgreSQL readiness check failed", {
      name: error?.name || "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
    });
  }

  let redisStatus = "unavailable";
  try {
    await waitForRedisReady(redisClient);
    const response = await redisClient.ping();
    redisStatus = response === "PONG" ? "connected" : "unexpected_response";
  } catch (error) {
    logger.warn?.("Redis readiness check failed", {
      name: error?.name || "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
      status: typeof redisClient?.status === "string" ? redisClient.status : "unknown",
    });
  }
  const status = database !== "connected" ? "not_ready" : redisStatus === "connected" ? "ready" : "degraded";
  return { status, database, redis: redisStatus };
};
