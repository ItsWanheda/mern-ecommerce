import test from "node:test";
import assert from "node:assert/strict";
import { getCategoryAttributeDefinitions, getProductAttributeRows } from "../src/lib/product-attributes.js";

const rootId = "65a000000000000000000001";
const childId = "65a000000000000000000002";
const categories = [
  {
    _id: rootId, slug: "clothing", ancestors: [],
    attributes: [
      { key: "material", name: { fa: "جنس", en: "Material" }, type: "select", options: [{ value: "cotton", name: { fa: "نخ پنبه", en: "Cotton" } }], inherited: true, showInProductDetails: true, sortOrder: 2 },
      { key: "internal_note", name: { fa: "یادداشت داخلی", en: "Internal note" }, type: "text", inherited: true, showInProductDetails: false },
    ],
  },
  {
    _id: childId, slug: "shirts", parentId: rootId, ancestors: [rootId],
    attributes: [{ key: "length", name: { fa: "قد", en: "Length" }, type: "number", unit: { fa: "سانتی‌متر", en: "cm" }, inherited: false, showInProductDetails: true, sortOrder: 1 }],
  },
];

test("product specs use localized category labels, option names, and units", () => {
  const rows = getProductAttributeRows({ category: "shirts", attributes: { material: "cotton", length: "72" } }, categories);
  assert.deepEqual(rows.map((row) => row.label), ["قد", "جنس"]);
  assert.equal(rows[0].value, "۷۲");
  assert.equal(rows[0].unit, "سانتی‌متر");
  assert.equal(rows[1].value, "نخ پنبه");
});

test("admin visibility and inheritance settings are respected", () => {
  const product = { category: "shirts", attributes: { material: "cotton", length: 72, internal_note: "private" } };
  assert.deepEqual(getProductAttributeRows(product, categories).map((row) => row.key), ["length", "material"]);
  const definitions = getCategoryAttributeDefinitions(product, categories);
  assert.equal(definitions.has("material"), true);
  assert.equal(definitions.has("internal_note"), true);
});

test("child category definitions override inherited parent definitions", () => {
  const custom = [...categories, { _id: "65a000000000000000000003", slug: "formal-shirts", ancestors: [rootId, childId], attributes: [{ key: "material", name: { fa: "نوع پارچه", en: "Fabric type" }, type: "text", inherited: true, showInProductDetails: true, sortOrder: 0 }] }];
  const rows = getProductAttributeRows({ category: "formal-shirts", attributes: { material: "لینن" } }, custom);
  assert.equal(rows[0].label, "نوع پارچه");
});

test("legacy products without category metadata keep readable fallback values", () => {
  const rows = getProductAttributeRows({ attributes: { fabric_type: "cotton", available: false } }, []);
  assert.deepEqual(rows.map((row) => row.label), ["available", "fabric type"]);
  assert.equal(rows[0].value, "خیر");
});
