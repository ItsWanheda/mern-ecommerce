import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/components/CustomerManagement.jsx", import.meta.url), "utf8");

test("customer session details distinguish sign-in metadata from last observed activity", () => {
  assert.match(source, /loginIpAddress/);
  assert.match(source, /lastIpAddress/);
  assert.match(source, /loginUserAgent/);
  assert.match(source, /lastUserAgent/);
  assert.match(source, /آخرین فعالیت نشست/);
  assert.match(source, /lastLoginAt/);
  assert.match(source, /lastActivityAt/);
  assert.match(source, /آخرین فعالیت ثبت‌شده نشست/);
  assert.match(source, /به معنی ثبت تک‌تک درخواست‌ها نیست/);
  assert.match(source, /برای نشست‌های قدیمی/);
});
