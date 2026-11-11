import test from "node:test";
import assert from "node:assert/strict";
import { getAdminPageAccessStatus } from "../lib/admin-page-access.js";

test("admin page access requires an authenticated active account", () => {
  assert.equal(getAdminPageAccessStatus({ user: null }), 401);
  assert.equal(getAdminPageAccessStatus({ user: { role: "admin", isActive: false } }), 401);
});

test("regular customers cannot open the admin dashboard", () => {
  assert.equal(getAdminPageAccessStatus({ user: { role: "customer", isActive: true } }), 403);
});

test("active administrators can open the admin dashboard", () => {
  assert.equal(getAdminPageAccessStatus({ user: { role: "admin", isActive: true } }), 200);
});

test("revoked sessions and stale refresh tokens cannot authorize an admin page request", () => {
  const admin = { role: "admin", isActive: true };
  assert.equal(getAdminPageAccessStatus({ user: admin, sessionActive: false }), 401);
  assert.equal(getAdminPageAccessStatus({ user: admin, refreshTokenMatches: false }), 401);
});
