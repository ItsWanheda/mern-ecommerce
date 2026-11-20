import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { STORE_CURRENCY, formatPrice, getCurrencyLabel } from "../../frontend/src/lib/commerce.js";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaSchema = await readFile(path.join(backendDir, "prisma", "schema.prisma"), "utf8");
const orderModel = prismaSchema.match(/model Order\s*\{([\s\S]*?)\n\}/)?.[1] || "";
const migrationSql = await readFile(path.join(backendDir, "prisma", "migrations", "20261119000000_initial_postgresql", "migration.sql"), "utf8");

test("the storefront and PostgreSQL schema have exactly one configured currency", () => {
  assert.equal(STORE_CURRENCY, "IRT");
  assert.match(orderModel, /currency\s+String\s+@default\(\"IRT\"\)/);
  assert.match(migrationSql, /\"currency\" TEXT NOT NULL DEFAULT 'IRT'/);
});

test("Toman is the only displayed price format", () => {
  assert.equal(getCurrencyLabel(), "تومان");
  assert.equal(formatPrice(125000), "۱۲۵٬۰۰۰ تومان");
  assert.equal(formatPrice(Number.NaN), "—");
});

test("Zarinpal is the only permitted order payment provider", () => {
  assert.match(orderModel, /paymentProvider\s+String\s+@default\(\"zarinpal\"\)/);
  assert.match(migrationSql, /\"paymentProvider\" TEXT NOT NULL DEFAULT 'zarinpal'/);
  assert.match(migrationSql, /\"currency\" = 'IRT' AND \"paymentProvider\" = 'zarinpal'/);
});
