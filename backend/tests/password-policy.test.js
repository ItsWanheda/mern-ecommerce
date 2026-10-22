import test from "node:test";
import assert from "node:assert/strict";
import { getPasswordPolicyError, isStrongPassword } from "../lib/password-policy.js";

test("password policy rejects short, common-looking, and composition-weak passwords", () => {
  for (const password of ["short", "password1234", "lowercaseonly123!", "NOLOWERCASE123!"]) {
    assert.notEqual(getPasswordPolicyError(password), "");
    assert.equal(isStrongPassword(password), false);
  }
});

test("password policy accepts a long mixed password and a long Unicode passphrase", () => {
  assert.equal(getPasswordPolicyError("StrongPassword2026!"), "");
  assert.equal(getPasswordPolicyError("عبارت-امن-شده-با-عدد-123!"), "");
  assert.equal(isStrongPassword("StrongPassword2026!"), true);
});

test("password policy rejects inputs exceeding bcrypt's effective UTF-8 byte limit", () => {
  assert.match(getPasswordPolicyError("آ".repeat(30)), /۷۲ بایت/);
});

test("password policy handles missing and non-string values safely", () => {
  assert.notEqual(getPasswordPolicyError(undefined), "");
  assert.notEqual(getPasswordPolicyError(null), "");
});
