import test from "node:test";
import assert from "node:assert/strict";
import { getKnownProductStock } from "../lib/inventory-stock.js";

test("null, missing, and empty stock remain unknown instead of becoming zero", () => {
  assert.equal(getKnownProductStock({ stock: null }), null);
  assert.equal(getKnownProductStock({}), null);
  assert.equal(getKnownProductStock({ stock: "" }), null);
});

test("known product stock is preserved, including an actual zero", () => {
  assert.equal(getKnownProductStock({ stock: 0 }), 0);
  assert.equal(getKnownProductStock({ stock: "4" }), 4);
});

test("variant totals stay unknown until every variant quantity is configured", () => {
  assert.equal(getKnownProductStock({ variants: [{ stock: 2 }, { stock: null }] }), null);
  assert.equal(getKnownProductStock({ variants: [{ stock: 2 }, { stock: 3 }] }), 5);
  assert.equal(getKnownProductStock({ variants: [], stock: 4 }), 4);
});
