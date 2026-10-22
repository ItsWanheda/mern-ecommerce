import test from "node:test";
import assert from "node:assert/strict";
import { hasAdministratorManagementAccess, canPreserveAdministratorManagement } from "../lib/admin-permissions.js";

test("delegated admins may keep narrow permissions if another active admin manages access", () => {
  assert.equal(hasAdministratorManagementAccess("admin", true, ["catalogue.manage"]), false);
  assert.equal(canPreserveAdministratorManagement({
    nextRole: "admin", nextActive: true, nextPermissions: ["catalogue.manage"],
    otherActiveAdmins: [{ permissions: ["roles.manage", "customers.manage"] }],
  }), true);
});

test("the last active admin cannot lose administrator-management access", () => {
  assert.equal(canPreserveAdministratorManagement({
    nextRole: "admin", nextActive: true, nextPermissions: ["catalogue.manage"], otherActiveAdmins: [],
  }), false);
});

test("full-access and legacy active administrators preserve management access", () => {
  assert.equal(hasAdministratorManagementAccess("admin", true, ["*"]), true);
  assert.equal(hasAdministratorManagementAccess("admin", true, undefined), true);
  assert.equal(canPreserveAdministratorManagement({
    nextRole: "customer", nextActive: true, nextPermissions: undefined,
    otherActiveAdmins: [{ permissions: undefined }],
  }), true);
});

test("inactive and customer accounts do not count as management-capable administrators", () => {
  assert.equal(hasAdministratorManagementAccess("admin", false, ["roles.manage"]), false);
  assert.equal(hasAdministratorManagementAccess("customer", true, ["roles.manage"]), false);
});
