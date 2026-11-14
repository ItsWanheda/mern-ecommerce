import test from "node:test";
import assert from "node:assert/strict";
import { normalizeCustomSpecifications } from "../lib/custom-product-specifications.js";

test("normalizes valid custom product specifications", () => {
  assert.deepEqual(normalizeCustomSpecifications([
    { name: " گارانتی ", value: " ۱۸ ماه " },
    { name: "اقلام همراه", value: "کابل و دفترچه راهنما" },
  ]), {
    values: [
      { name: "گارانتی", value: "۱۸ ماه" },
      { name: "اقلام همراه", value: "کابل و دفترچه راهنما" },
    ],
  });
});

test("ignores completely blank rows but rejects partially completed rows", () => {
  assert.deepEqual(normalizeCustomSpecifications([{ name: " ", value: "" }]), { values: [] });
  assert.match(normalizeCustomSpecifications([{ name: "گارانتی", value: "" }]).error, /عنوان|مقدار/);
});

test("rejects duplicate labels and oversized values", () => {
  assert.match(normalizeCustomSpecifications([
    { name: "گارانتی", value: "۱۲ ماه" },
    { name: "گارانتی", value: "۲۴ ماه" },
  ]).error, /تکراری/);
  assert.match(normalizeCustomSpecifications([{ name: "مشخصه", value: "x".repeat(501) }]).error, /۵۰۰/);
});

test("preserves existing specifications when an older update omits the field", () => {
  const existing = [{ name: "گارانتی", value: "۱۸ ماه" }];
  assert.deepEqual(normalizeCustomSpecifications(undefined, existing), { values: existing });
});

test("enforces the per-product specification row limit", () => {
  const tooMany = Array.from({ length: 31 }, (_, index) => ({ name: "مشخصه " + index, value: "مقدار" }));
  assert.match(normalizeCustomSpecifications(tooMany).error, /۳۰/);
});
