import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductDiscountAmount,
  getProductDiscountPercent,
  getProductDiscountedPrice,
} from "../src/lib/commerce.js";

test("storefront percentage discounts match whole-Toman checkout rounding", () => {
  const product = { price: 999, discountPercent: 10 };
  assert.equal(getProductDiscountPercent(product), 10);
  assert.equal(getProductDiscountAmount(product), 100);
  assert.equal(getProductDiscountedPrice(product), 899);
});

test("legacy products and removed discounts keep their original price", () => {
  assert.equal(getProductDiscountPercent({ price: 100000 }), 0);
  assert.equal(getProductDiscountedPrice({ price: 100000 }), 100000);
  assert.equal(getProductDiscountedPrice({ price: 100000, discountPercent: 0 }), 100000);
});

test("invalid or unsupported discount percentages fail closed", () => {
  for (const discountPercent of [-1, 1.5, 100, "invalid"]) {
    assert.equal(getProductDiscountPercent({ price: 100000, discountPercent }), 0);
    assert.equal(getProductDiscountedPrice({ price: 100000, discountPercent }), 100000);
  }
});
