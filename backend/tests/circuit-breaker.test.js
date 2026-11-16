import test from "node:test";
import assert from "node:assert/strict";
import { createCircuitBreaker } from "../lib/circuit-breaker.js";

test("opens after repeated failures and skips calls during cooldown", async () => {
  let now = 1000;
  let attempts = 0;
  const breaker = createCircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 5000, now: () => now });
  const fail = async () => { attempts += 1; throw new Error("Redis offline"); };
  const first = await breaker.execute(fail);
  const second = await breaker.execute(fail);
  const skipped = await breaker.execute(fail);
  assert.equal(first.state, "closed");
  assert.equal(second.state, "open");
  assert.equal(skipped.skipped, true);
  assert.equal(attempts, 2);
});

test("allows one half-open probe and closes after Redis recovers", async () => {
  let now = 1000;
  const breaker = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, now: () => now });
  await breaker.execute(async () => { throw new Error("offline"); });
  now += 100;
  let releaseProbe;
  const probe = breaker.execute(() => new Promise((resolve) => { releaseProbe = resolve; }));
  await Promise.resolve();
  assert.equal((await breaker.execute(async () => "should not run")).skipped, true);
  releaseProbe("online");
  assert.deepEqual(await probe, { ok: true, value: "online", state: "closed" });
  assert.equal((await breaker.execute(async () => "ok")).ok, true);
});

test("reopens the circuit when its recovery probe fails", async () => {
  let now = 2000;
  const breaker = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50, now: () => now });
  await breaker.execute(async () => { throw new Error("offline"); });
  now += 50;
  assert.equal((await breaker.execute(async () => { throw new Error("still offline"); })).state, "open");
  assert.equal((await breaker.execute(async () => "not called")).skipped, true);
});
