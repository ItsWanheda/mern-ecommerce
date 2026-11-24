import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const controller = await readFile(path.join(backendDir, "controllers", "admin.controller.js"), "utf8");
const routes = await readFile(path.join(backendDir, "routes", "admin.route.js"), "utf8");
const auth = await readFile(path.join(backendDir, "controllers", "auth.controller.js"), "utf8");
const schema = await readFile(path.join(backendDir, "prisma", "schema.prisma"), "utf8");
const migration = await readFile(path.join(backendDir, "prisma", "migrations", "20261124000000_add_account_session_activity_metadata", "migration.sql"), "utf8");

test("customer session history endpoint is admin-protected and excludes authentication secrets", () => {
  assert.match(routes, /get\(["']\/customers\/:id\/sessions["'],\s*protectRoute,\s*adminRoute,\s*getCustomerSessions\)/);
  const handler = controller.slice(controller.indexOf("export const getCustomerSessions"), controller.indexOf("export const updateCustomerAccess"));
  for (const field of ["deviceName", "userAgent", "ipAddress", "loginIpAddress", "lastIpAddress", "loginUserAgent", "lastUserAgent", "createdAt", "lastUsedAt", "expiresAt", "revokedAt"]) {
    assert.match(handler, new RegExp(field + "\\s*:\\s*true"));
  }
  assert.doesNotMatch(handler, /tokenId/);
});

test("new sessions store login values separately from later refresh activity", () => {
  assert.match(auth, /loginIpAddress: clientIpAddress\.slice\(0, 80\)/);
  assert.match(auth, /lastIpAddress: clientIpAddress\.slice\(0, 80\)/);
  assert.match(auth, /loginUserAgent: userAgent/);
  assert.match(auth, /lastUserAgent: userAgent/);

  const refreshHandler = auth.slice(auth.indexOf("export const refreshToken"), auth.indexOf("export const getProfile"));
  assert.match(refreshHandler, /session\.lastIpAddress = currentIpAddress\.slice\(0, 80\)/);
  assert.match(refreshHandler, /session\.lastUserAgent = currentUserAgent/);
  assert.doesNotMatch(refreshHandler, /session\.ipAddress = currentIpAddress/);
  assert.doesNotMatch(refreshHandler, /session\.userAgent = currentUserAgent/);
});

test("session metadata migration is additive and backfills only historical last-observed values", () => {
  for (const field of ["loginIpAddress", "lastIpAddress", "loginUserAgent", "lastUserAgent"]) {
    assert.match(schema, new RegExp(field + "\\s+String"));
    assert.match(migration, new RegExp('ADD COLUMN "' + field + '" TEXT NOT NULL DEFAULT'));
  }
  assert.match(migration, /SET "lastIpAddress" = "ipAddress"/);
  assert.match(migration, /"lastUserAgent" = "userAgent"/);
});
