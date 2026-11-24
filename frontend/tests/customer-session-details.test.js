import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/components/CustomerManagement.jsx", import.meta.url), "utf8");

test("customer session details disclose when the activity timestamp is refreshed", () => {
  assert.match(source, /آخرین نوسازی نشست/);
  assert.match(source, /به معنی ثبت تک‌تک درخواست‌ها نیست/);
});
