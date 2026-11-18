import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(path.join(backendDir, "prisma", "schema.prisma"), "utf8");
const packageManifest = JSON.parse(await readFile(path.join(backendDir, "package.json"), "utf8"));
const bootstrap = await readFile(path.join(backendDir, "scripts", "create-admin.mjs"), "utf8");

const modelNames = [...schema.matchAll(/^model\s+(\w+)\s*\{$/gm)].map((match) => match[1]);

test("Prisma schema targets PostgreSQL and covers all 13 current model families", () => {
  assert.match(schema, /datasource\s+db\s*\{[\s\S]*?provider\s*=\s*"postgresql"/);
  assert.deepEqual(new Set(modelNames), new Set([
    "User",
    "AccountSession",
    "SecurityNotification",
    "AuditLog",
    "Campaign",
    "Category",
    "Coupon",
    "NewsletterSubscriber",
    "Order",
    "ProductReview",
    "Product",
    "ServiceCase",
    "StoreSettings",
  ]));
  assert.equal(modelNames.length, 13);
  const primaryKeyDefinitions = [...schema.matchAll(/^\\s*id\\s+String\\s+@id\\s+@default\\(dbgenerated\\("substring\\(replace\\(gen_random_uuid\\(\\)::text, '-', ''\\), 1, 24\\)"\\)\\)\\s+@db\\.VarChar\\(24\\)/gm)];
  assert.equal(primaryKeyDefinitions.length, 13, "all model IDs must preserve the legacy 24-character hexadecimal API format");
});

test("Prisma foundation retains critical account, payment, and inventory fields", () => {
  assert.match(schema, /email\s+String\s+@unique/);
  assert.match(schema, /permissions\s+Json\?/);
  assert.match(schema, /twoFactorEnabled\s+Boolean/);
  assert.match(schema, /zarinpalAuthority\s+String\?\s+@unique/);
  assert.match(schema, /paymentRequestStatus\s+String/);
  assert.match(schema, /reconciliationNextAttemptAt\s+DateTime\?/);
  assert.match(schema, /stock\s+Int\?/);
});

test("initial Admin bootstrap is explicitly gated and cannot promote an existing customer", () => {
  assert.match(bootstrap, /ALLOW_ADMIN_BOOTSTRAP !== "true"/);
  assert.match(bootstrap, /existingAdminCount > 0/);
  assert.match(bootstrap, /existingEmail/);
  assert.match(bootstrap, /bcrypt\.hash\(password, 12\)/);
  assert.match(bootstrap, /permissions: \["\*"\]/);
});

test("Prisma packages and database scripts are declared without changing Redis", () => {
  assert.equal(packageManifest.dependencies["@prisma/client"], "6.19.3");
  assert.equal(packageManifest.devDependencies.prisma, "6.19.3");
  assert.equal(packageManifest.dependencies.ioredis, "^5.4.1");
  assert.equal(packageManifest.dependencies.mongoose, "^8.5.3");
  assert.equal(packageManifest.scripts["db:admin:create"], "node scripts/create-admin.mjs");
});
