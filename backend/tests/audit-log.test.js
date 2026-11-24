import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { toAuditJsonValue } from "../lib/audit-log.js";

test("audit metadata converts Decimal, Date, functions and circular references to JSON-safe values", () => {
  const metadata = {
    price: new Prisma.Decimal("25217332"),
    createdAt: new Date("2026-11-24T00:00:00.000Z"),
    nested: { callback: () => "not JSON" },
  };
  metadata.self = metadata;

  const safe = toAuditJsonValue(metadata);
  assert.equal(safe.price, "25217332");
  assert.equal(safe.createdAt, "2026-11-24T00:00:00.000Z");
  assert.deepEqual(safe.nested, {});
  assert.equal(safe.self, "[Circular]");
  assert.doesNotThrow(() => JSON.stringify(safe));
});

test("audit metadata omits unsupported object properties and preserves array positions", () => {
  const safe = toAuditJsonValue({
    values: [1, undefined, new Prisma.Decimal("0.5")],
    constructor: () => "must not be serialized",
  });
  assert.deepEqual(safe, { values: [1, null, "0.5"] });
});
