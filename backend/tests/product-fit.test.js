import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProductFit } from "../lib/product-fit.js";

test("keeps absent fit metadata empty for hardware products", () => {
  assert.deepEqual(normalizeProductFit(null), {});
  assert.deepEqual(normalizeProductFit(undefined), {});
  assert.deepEqual(normalizeProductFit({}), {});
  assert.deepEqual(normalizeProductFit({
    type: "",
    description: " ",
    modelHeight: "",
    modelSize: "",
  }), {});
});

test("preserves valid legacy clothing-fit metadata", () => {
  assert.deepEqual(normalizeProductFit({
    type: "slim",
    description: " Fits close to the body ",
    modelHeight: "180 cm",
    modelSize: "M",
  }), {
    type: "slim",
    description: "Fits close to the body",
    modelHeight: "180 cm",
    modelSize: "M",
  });
});

test("uses the legacy regular-fit fallback only when actual fit data exists", () => {
  assert.deepEqual(normalizeProductFit({
    type: "unsupported",
    description: "Some fit notes",
  }), {
    type: "regular",
    description: "Some fit notes",
    modelHeight: "",
    modelSize: "",
  });
});

test("ignores arrays and non-object fit payloads", () => {
  assert.deepEqual(normalizeProductFit([]), {});
  assert.deepEqual(normalizeProductFit("regular"), {});
});
