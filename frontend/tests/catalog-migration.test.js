import test from "node:test";
import assert from "node:assert/strict";
import { requiresCatalogMigration } from "../src/lib/catalog-migration.js";

test("new hardware products with category-defined technical attributes are orderable", () => {
  assert.equal(requiresCatalogMigration({
    category: "graphics-cards",
    attributes: { chipset: "nvidia", memory_gb: 16, interface: "pcie-5" },
    variants: [], sizes: [], colors: [], sizeChart: [], fit: null,
  }), false);
});

test("legacy variant, size, colour, fit, and size-chart records require migration", () => {
  const legacyProducts = [
    { variants: [{ size: "L", color: "black", stock: 2 }] },
    { sizes: ["S", "M"] },
    { colors: [{ name: "Black" }] },
    { fit: { type: "regular", description: "قالب استاندارد لباس" } },
    { sizeChart: [{ size: "M", chest: 96 }] },
  ];
  for (const product of legacyProducts) assert.equal(requiresCatalogMigration(product), true);
});

test("empty and accidentally generated default fit metadata do not block hardware products", () => {
  assert.equal(requiresCatalogMigration({ variants: [], sizes: [], colors: [], sizeChart: [], fit: null }), false);
  assert.equal(requiresCatalogMigration({ variants: [], sizes: [], colors: [], sizeChart: [], fit: {} }), false);
  assert.equal(requiresCatalogMigration({
    variants: [], sizes: [], colors: [], sizeChart: [],
    fit: { type: "regular", description: "", modelHeight: "", modelSize: "" },
  }), false);
  assert.equal(requiresCatalogMigration(null), false);
});
