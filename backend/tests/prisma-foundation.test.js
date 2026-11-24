import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { toPrismaWhere, decimalToNumber } from "../lib/prisma-model.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = await readFile(path.join(backendDir, "prisma", "schema.prisma"), "utf8");
const packageManifest = JSON.parse(await readFile(path.join(backendDir, "package.json"), "utf8"));
const bootstrap = await readFile(path.join(backendDir, "scripts", "create-admin.mjs"), "utf8");
const adapter = await readFile(path.join(backendDir, "lib", "prisma-model.js"), "utf8");
const productController = await readFile(path.join(backendDir, "controllers", "product.controller.js"), "utf8");

// This assertion is specifically about the application runtime. One-off data
// migration utilities and legacy integration fixtures may intentionally retain
// MongoDB tooling without being loaded by the production API.
const ignoredSourceDirectories = new Set([
  "node_modules", ".git", "dist", "coverage", "uploads", "scripts", "tests",
]);

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    if (entry.isDirectory() && ignoredSourceDirectories.has(entry.name)) return [];
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return /\.(?:js|mjs)$/.test(entry.name) ? [fullPath] : [];
  }));
  return nested.flat();
};
const backendSourceFiles = await collectSourceFiles(backendDir);
const backendSource = (await Promise.all(backendSourceFiles.map(file => readFile(file, "utf8")))).join("\n");

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
  const primaryKeyDefinitions = [...schema.matchAll(/^\s*id\s+String\s+@id\s+@default\(dbgenerated\("substring\(replace\(gen_random_uuid\(\)::text, '-', ''\), 1, 24\)"\)\)\s+@db\.VarChar\(24\)/gm)];
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

test("Prisma packages and database scripts are declared without changing Redis", async () => {
  assert.equal(packageManifest.dependencies["@prisma/client"], "6.19.3");
  assert.equal(packageManifest.devDependencies.prisma, "6.19.3");
  assert.equal(packageManifest.dependencies.ioredis, "^5.4.1");
  assert.equal(packageManifest.dependencies.mongoose, undefined);
  assert.equal(packageManifest.scripts["db:admin:create"], "node scripts/create-admin.mjs");
  assert.equal(packageManifest.scripts["db:migrate:deploy"], "prisma migrate deploy");
  // A pre-migration lockfile would still pin Mongoose and MongoDB. CI generates
  // a fresh lockfile from this manifest before running npm ci.
  const lockPath = path.join(backendDir, "package-lock.json");
  try {
    await access(lockPath);
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    assert.equal(lock.packages?.["node_modules/mongoose"], undefined);
    assert.equal(lock.packages?.["node_modules/@prisma/client"]?.version, "6.19.3");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
});

const migrationSql = await readFile(path.join(backendDir, "prisma", "migrations", "20261119000000_initial_postgresql", "migration.sql"), "utf8");
const indexMigrationSql = await readFile(path.join(backendDir, "prisma", "migrations", "20261124010000_add_missing_foreign_key_indexes", "migration.sql"), "utf8");
test("the initial PostgreSQL migration creates every application persistence table", () => {
  for (const table of ["users", "account_sessions", "security_notifications", "audit_logs", "campaigns", "categories", "coupons", "newsletter_subscribers", "orders", "product_reviews", "products", "service_cases", "store_settings"]) {
    assert.match(migrationSql, new RegExp(`CREATE TABLE \"${table}\"`));
  }
  assert.match(migrationSql, /CREATE TABLE \"_CampaignProducts\"/);
  assert.match(migrationSql, /DEFAULT substring\(replace\(gen_random_uuid/);
  assert.doesNotMatch(migrationSql, /MONGO_URI|mongoose/i);
});


test("the backend runtime no longer imports or connects through Mongoose", () => {
  assert.doesNotMatch(backendSource, /(?:from|require\()\s*["']mongoose["']/);
  assert.doesNotMatch(backendSource, /mongoose\.(?:connect|createConnection|startSession)/);
  assert.equal(packageManifest.dependencies.mongoose, undefined);
  assert.equal(packageManifest.dependencies["@prisma/client"], "6.19.3");
});

test("Prisma compatibility adapter preserves secret visibility and guarded conditional writes", () => {
  assert.doesNotMatch(adapter.match(/const hiddenUserFields = new Set\(\[([\s\S]*?)\]\);/)?.[1] || "", /\bpassword\b/);
  assert.match(adapter, /isAtomicScalarUpdate\(model, update\) && !filterNeedsPostProcessing\(model, filter\)/);
  assert.match(adapter, /mapped\.code = 11000/);
  assert.match(adapter, /orderUpdates: true,[\s\S]*securityAlerts: true,[\s\S]*productNews: false,[\s\S]*promotionalEmails: false/);
});

test("Prisma adapter translates null membership without invalid scalar IN values", () => {
  assert.deepEqual(toPrismaWhere("order", { trackingCode: { $in: ["", null] } }), { trackingCode: { in: [""] } });
  assert.deepEqual(toPrismaWhere("order", { zarinpalAuthority: { $in: [null, ""] } }), { OR: [{ zarinpalAuthority: { in: [""] } }, { zarinpalAuthority: null }] });
  assert.deepEqual(toPrismaWhere("order", { zarinpalAuthority: { $nin: [null, ""] } }), { AND: [{ zarinpalAuthority: { notIn: [""] } }, { zarinpalAuthority: { not: null } }] });
});

test("Prisma adapter preserves case-insensitive Mongo-style searches", () => {
  assert.deepEqual(toPrismaWhere("user", { email: /customer@example\.com/i }), { email: { contains: "customer@example.com", mode: "insensitive" } });
});

test("PostgreSQL product variants use the required empty JSON-array representation", () => {
  assert.deepEqual(toPrismaWhere("product", { variants: { $size: 0 } }), { variants: { equals: [] } });
  assert.doesNotMatch(productController, /variants:\s*\{\s*\$exists:\s*false\s*\}/);
});


test("Prisma Decimal values are normalized without relying on constructor names", () => {
  const price = new Prisma.Decimal("25217332");
  assert.equal(decimalToNumber(price), 25217332);
  assert.equal(typeof decimalToNumber(price), "number");
  assert.deepEqual(decimalToNumber({ price, nested: [new Prisma.Decimal("125.50")] }), {
    price: 25217332,
    nested: [125.5],
  });
});

test("product document saves preserve the persisted required price when a payload omits it", () => {
  assert.match(adapter, /if \(data\.price == null \|\| !Number\.isFinite\(Number\(data\.price\)\)\)/);
  assert.match(adapter, /select: \{ price: true, discountPercent: true \}/);
  assert.match(adapter, /data\.price = Number\(persistedProduct\.price\.toString\(\)\)/);
});


test("Prisma adapter leaves Mongo JSON-array elemMatch predicates to exact post-filtering", () => {
  assert.deepEqual(toPrismaWhere("product", {
    variants: { $elemMatch: { size: "M", color: "Black" } },
  }), {});
  assert.deepEqual(toPrismaWhere("product", {
    _id: { $in: ["aaaaaaaaaaaaaaaaaaaaaaaa"] },
    variants: { $elemMatch: { size: "M", color: "Black" } },
  }), { id: { in: ["aaaaaaaaaaaaaaaaaaaaaaaa"] } });
  // An OR containing a JavaScript-only branch must not be narrowed to only
  // the SQL-translatable branch, otherwise valid rows could be omitted.
  assert.deepEqual(toPrismaWhere("product", {
    $or: [
      { variants: { $elemMatch: { size: "M" } } },
      { name: "Exact match" },
    ],
  }), {});
});

test("Prisma adapter enforces single-record and safe filtered delete semantics", () => {
  assert.match(adapter, /if \(!options\.many && rowsRaw\.length > 1\) rowsRaw = rowsRaw\.slice\(0, 1\)/);
  assert.match(adapter, /async deleteOne\(filter = \{\}, options = \{\}\)/);
  assert.match(adapter, /async deleteMany\(filter = \{\}, options = \{\}\)/);
  assert.match(adapter, /matchesFilter\(fromPrisma\(delegate, candidate\), filter\)/);
  assert.match(adapter, /updatedAt: candidate\.updatedAt/);
  assert.match(adapter, /where: \{ OR: guards \}/);
});

test("PostgreSQL schema and additive migration index previously unindexed foreign keys", () => {
  for (const index of [
    /@@index\(\[createdById\]\)/,
    /@@index\(\[orderId\]\)/,
    /@@index\(\[moderatedById\]\)/,
    /@@index\(\[updatedById\]\)/,
  ]) assert.match(schema, index);
  for (const index of [
    /campaigns_createdById_idx/,
    /coupons_createdById_idx/,
    /product_reviews_userId_idx/,
    /product_reviews_orderId_idx/,
    /product_reviews_moderatedById_idx/,
    /store_settings_updatedById_idx/,
  ]) assert.match(indexMigrationSql, index);
});
