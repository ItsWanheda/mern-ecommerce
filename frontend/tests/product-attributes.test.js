import test from "node:test";
import assert from "node:assert/strict";
import { getCategoryAttributeDefinitions, getProductAttributeRows } from "../src/lib/product-attributes.js";

const rootId = "65a000000000000000000001";
const childId = "65a000000000000000000002";
const categories = [
  {
    _id: rootId, slug: "processors", ancestors: [],
    attributes: [
      { key: "manufacturer", name: { fa: "سازنده", en: "Manufacturer" }, type: "select", options: [{ value: "intel", name: { fa: "اینتل", en: "Intel" } }], inherited: true, showInProductDetails: true, sortOrder: 2 },
      { key: "internal_note", name: { fa: "یادداشت داخلی", en: "Internal note" }, type: "text", inherited: true, showInProductDetails: false },
    ],
  },
  {
    _id: childId, slug: "desktop-cpus", parentId: rootId, ancestors: [rootId],
    attributes: [{ key: "base_clock", name: { fa: "فرکانس پایه", en: "Base clock" }, type: "number", unit: { fa: "گیگاهرتز", en: "GHz" }, inherited: false, showInProductDetails: true, sortOrder: 1 }],
  },
];

test("product specs use localized category labels, option names, and units", () => {
  const rows = getProductAttributeRows({ category: "desktop-cpus", attributes: { manufacturer: "intel", base_clock: "3.5" } }, categories);
  assert.deepEqual(rows.map((row) => row.label), ["فرکانس پایه", "سازنده"]);
  assert.equal(rows[0].value, "۳٫۵");
  assert.equal(rows[0].unit, "گیگاهرتز");
  assert.equal(rows[1].value, "اینتل");
});

test("admin visibility and inheritance settings are respected", () => {
  const product = { category: "desktop-cpus", attributes: { manufacturer: "intel", base_clock: 3.5, internal_note: "private" } };
  assert.deepEqual(getProductAttributeRows(product, categories).map((row) => row.key), ["base_clock", "manufacturer"]);
  const definitions = getCategoryAttributeDefinitions(product, categories);
  assert.equal(definitions.has("manufacturer"), true);
  assert.equal(definitions.has("internal_note"), true);
});

test("child category definitions override inherited parent definitions", () => {
  const custom = [...categories, { _id: "65a000000000000000000003", slug: "workstation-cpus", ancestors: [rootId, childId], attributes: [{ key: "manufacturer", name: { fa: "سازنده پردازنده", en: "CPU manufacturer" }, type: "text", inherited: true, showInProductDetails: true, sortOrder: 0 }] }];
  const rows = getProductAttributeRows({ category: "workstation-cpus", attributes: { manufacturer: "amd" } }, custom);
  assert.equal(rows[0].label, "سازنده پردازنده");
});

test("products without category metadata keep readable fallback values", () => {
  const rows = getProductAttributeRows({ attributes: { supported_standards: "pcie-5", available: false } }, []);
  assert.deepEqual(rows.map((row) => row.label), ["available", "supported standards"]);
  assert.equal(rows[0].value, "خیر");
});
