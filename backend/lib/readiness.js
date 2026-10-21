import mongoose from "mongoose";

const databaseLabel = (readyState) => readyState === 1 ? "connected"
  : readyState === 2 ? "connecting"
  : readyState === 3 ? "disconnecting"
  : "disconnected";

export const getReadinessStatus = async ({
  databaseReady = mongoose.connection.readyState === 1,
  redisClient,
  logger = console,
} = {}) => {
  let redisStatus = "unavailable";
  try {
    const response = await redisClient.ping();
    redisStatus = response === "PONG" ? "connected" : "unexpected_response";
  } catch (error) {
    // Log enough to identify DNS, TLS, authentication, or timeout classes,
    // but never log the raw message because it may contain endpoint details.
    logger.warn?.("Redis readiness check failed", {
      name: error?.name || "Error",
      code: typeof error?.code === "string" ? error.code : undefined,
      status: typeof redisClient?.status === "string" ? redisClient.status : "unknown",
    });
    redisStatus = "unavailable";
  }

  const database = databaseReady ? "connected" : databaseLabel(mongoose.connection.readyState);
  const ready = Boolean(databaseReady) && redisStatus === "connected";
  return { status: ready ? "ready" : "not_ready", database, redis: redisStatus };
};
