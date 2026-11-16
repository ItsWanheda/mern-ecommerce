import test from "node:test";
import assert from "node:assert/strict";
import { filterVisibleCategoryTree } from "../lib/category-tree.js";

test("keeps active categories with active ancestry and sorts them", () => {
  const categories = [
    { _id: "child", ancestors: ["root"], isActive: true, sortOrder: 1, name: { fa: "فرزند" } },
    { _id: "root", ancestors: [], isActive: true, sortOrder: 2, name: { fa: "ریشه" } },
    { _id: "hidden-child", ancestors: ["inactive"], isActive: true, sortOrder: 0, name: { fa: "پنهان" } },
    { _id: "inactive", ancestors: [], isActive: false, sortOrder: 0, name: { fa: "غیرفعال" } },
  ];
  assert.deepEqual(filterVisibleCategoryTree(categories).map((item) => item._id), ["child", "root"]);
});

test("preserves the existing rule that categories must be explicitly active", () => {
  const visible = filterVisibleCategoryTree([
    { _id: "legacy", ancestors: [], sortOrder: 0, name: { fa: "قدیمی" } },
  ]);
  assert.equal(visible.length, 0);
});
