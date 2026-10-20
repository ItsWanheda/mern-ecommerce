import mongoose from "mongoose";
const databaseLabel = (readyState) => readyState === 1 ? "connected"
  : readyState === 2 ? "connecting"
  : readyState === 3 ? "disconnecting"
  : "disconnected";

export const getReadinessStatus = async ({
  databaseReady = mongoose.connection.readyState === 1,
  redisClient,
} = {}) => {
  let redisStatus = "unavailable";
  try {
    const response = await redisClient.ping();
    redisStatus = response === "PONG" ? "connected" : "unexpected_response";
  } catch {
    redisStatus = "unavailable";
  }
  const database = databaseReady ? "connected" : databaseLabel(mongoose.connection.readyState);
  const ready = Boolean(databaseReady) && redisStatus === "connected";
  return { status: ready ? "ready" : "not_ready", database, redis: redisStatus };
};
