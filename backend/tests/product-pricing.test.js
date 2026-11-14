import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeProductDiscountPercent,
  getProductDiscountAmount,
  getProductDiscountedPrice,
} from "../lib/product-pricing.js";

test("normalizes valid integer percentages and treats invalid legacy values as no discount", () => {
  assert.equal(normalizeProductDiscountPercent(0), 0);
  assert.equal(normalizeProductDiscountPercent(15), 15);
  assert.equal(normalizeProductDiscountPercent(99), 99);
  assert.equal(normalizeProductDiscountPercent(100), 0);
  assert.equal(normalizeProductDiscountPercent(1.5), 0);
  assert.equal(normalizeProductDiscountPercent("nope"), 0);
});

test("calculates whole-Toman percentage discounts consistently", () => {
  assert.equal(getProductDiscountAmount({ price: 100000, discountPercent: 15 }), 15000);
  assert.equal(getProductDiscountedPrice({ price: 100000, discountPercent: 15 }), 85000);
  assert.equal(getProductDiscountAmount({ price: 999, discountPercent: 10 }), 100);
  assert.equal(getProductDiscountedPrice({ price: 999, discountPercent: 10 }), 899);
});

test("zero and absent discounts preserve legacy product prices", () => {
  assert.equal(getProductDiscountedPrice({ price: 125000 }), 125000);
  assert.equal(getProductDiscountedPrice({ price: 125000, discountPercent: 0 }), 125000);
  assert.equal(getProductDiscountAmount({ price: -1, discountPercent: 10 }), 0);
  assert.equal(getProductDiscountedPrice({ price: Number.NaN, discountPercent: 10 }), 0);
});
