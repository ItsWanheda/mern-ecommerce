import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../next.config.js";

test("Next.js development config allows the reported LAN host", () => {
  assert.ok(nextConfig.allowedDevOrigins.includes("172.31.224.1"));
  assert.ok(nextConfig.allowedDevOrigins.every((origin) => !/^https?:\/\//i.test(origin)));
  assert.equal(typeof nextConfig.rewrites, "function");
});
