import test from "node:test";
import assert from "node:assert/strict";
import { getReadinessStatus } from "../lib/readiness.js";

test("readiness fails when Redis is unavailable and recovers after reconnect", async () => {
  let connected = false;
  const redisClient = { ping: async () => {
    if (!connected) throw new Error("connection lost");
    return "PONG";
  } };
  const disconnected = await getReadinessStatus({ databaseReady: true, redisClient });
  assert.equal(disconnected.status, "not_ready");
  assert.equal(disconnected.redis, "unavailable");
  connected = true;
  const recovered = await getReadinessStatus({ databaseReady: true, redisClient });
  assert.equal(recovered.status, "ready");
  assert.equal(recovered.redis, "connected");
});

test("readiness fails when MongoDB is unavailable even if Redis responds", async () => {
  const status = await getReadinessStatus({ databaseReady: false, redisClient: { ping: async () => "PONG" } });
  assert.equal(status.status, "not_ready");
  assert.equal(status.database, "disconnected");
  assert.equal(status.redis, "connected");
});
