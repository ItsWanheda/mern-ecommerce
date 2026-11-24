import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controller = await readFile(path.join(backendDir, "controllers", "admin.controller.js"), "utf8");
const routes = await readFile(path.join(backendDir, "routes", "admin.route.js"), "utf8");
const auth = await readFile(path.join(backendDir, "controllers", "auth.controller.js"), "utf8");

test("customer session history endpoint is admin-protected and excludes authentication secrets", () => {
  assert.match(routes, /get\(["']\/customers\/:id\/sessions["'],\s*protectRoute,\s*adminRoute,\s*getCustomerSessions\)/);
  const handler = controller.slice(controller.indexOf("export const getCustomerSessions"), controller.indexOf("export const updateCustomerAccess"));
  for (const field of ["deviceName", "userAgent", "ipAddress", "createdAt", "lastUsedAt", "expiresAt", "revokedAt"]) {
    assert.match(handler, new RegExp(field + "\\s*:\\s*true"));
  }
  assert.doesNotMatch(handler, /tokenId/);
});

test("login and token refresh both capture the resolved client IP", () => {
  assert.match(auth, /ipAddress: clientIpAddress\.slice\(0, 80\)/);
  assert.match(auth, /session\.ipAddress = currentIpAddress\.slice\(0, 80\)/);
  assert.match(auth, /session\.userAgent = currentUserAgent/);
});
