import test from "node:test";
import assert from "node:assert/strict";
import { resolveCategoryAttributeDefinitions, validateCategoryAttributeValues } from "../src/lib/category-attributes.js";

const rootId = "65a000000000000000000001";
const childId = "65a000000000000000000002";
const baseAttributes = [
  { key: "manufacturer", name: { fa: "سازنده", en: "Manufacturer" }, type: "select", options: [{ value: "intel", name: { fa: "اینتل", en: "Intel" } }, { value: "amd", name: { fa: "ای‌ام‌دی", en: "AMD" } }], required: true, inherited: true, filterable: true, sortOrder: 1 },
  { key: "socket_type", name: { fa: "نوع سوکت", en: "Socket" }, type: "select", options: [{ value: "am5", name: { fa: "AM5", en: "AM5" } }], required: false, inherited: true, filterable: true, sortOrder: 2 },
  { key: "internal_note", name: { fa: "یادداشت داخلی", en: "Internal note" }, type: "text", inherited: true, filterable: false },
];
const categories = [
  { _id: rootId, slug: "processors", ancestors: [], attributes: baseAttributes },
  { _id: childId, slug: "desktop-cpus", parentId: rootId, ancestors: [rootId], attributes: [
    { key: "base_clock", name: { fa: "فرکانس پایه", en: "Base clock" }, type: "number", unit: { fa: "گیگاهرتز", en: "GHz" }, required: true, inherited: false, filterable: true, sortOrder: 0 },
  ] },
];

test("inherits parent attributes and keeps child-only attributes", () => {
  const definitions = resolveCategoryAttributeDefinitions(categories[1], categories);
  assert.deepEqual(definitions.map((item) => item.key), ["base_clock", "internal_note", "manufacturer", "socket_type"]);
});

test("child-specific definitions override inherited keys and non-inherited keys stay scoped", () => {
  const extended = [
    ...categories,
    { _id: "65a000000000000000000003", slug: "workstation-cpus", ancestors: [rootId, childId], attributes: [
      { key: "manufacturer", name: { fa: "سازنده پردازنده", en: "CPU maker" }, type: "text", inherited: true, filterable: false },
    ] },
  ];
  const definitions = resolveCategoryAttributeDefinitions(extended[2], extended);
  assert.equal(definitions.find((item) => item.key === "manufacturer").name.fa, "سازنده پردازنده");
  assert.equal(definitions.some((item) => item.key === "base_clock"), false);
});

test("category filters contain only admin-enabled filterable attributes", () => {
  const definitions = resolveCategoryAttributeDefinitions(categories[0], categories, { filterableOnly: true });
  assert.deepEqual(definitions.map((item) => item.key), ["manufacturer", "socket_type"]);
});

test("validates required values and all configured attribute types", () => {
  const definitions = [
    ...baseAttributes.slice(0, 2),
    { key: "base_clock", name: { fa: "فرکانس پایه" }, type: "number", required: true },
    { key: "integrated_graphics", name: { fa: "گرافیک مجتمع" }, type: "boolean", required: true },
    { key: "notes", name: { fa: "توضیحات" }, type: "text", required: false },
  ];
  assert.match(validateCategoryAttributeValues(definitions, { manufacturer: "intel" }), /فرکانس پایه/);
  assert.match(validateCategoryAttributeValues(definitions, { manufacturer: "unknown", base_clock: 3.5, integrated_graphics: false }), /سازنده/);
  assert.match(validateCategoryAttributeValues(definitions, { manufacturer: "intel", base_clock: "fast", integrated_graphics: false }), /فرکانس پایه/);
  assert.equal(validateCategoryAttributeValues(definitions, { manufacturer: "amd", base_clock: 3.8, integrated_graphics: false, notes: "AM5 platform" }), "");
});
