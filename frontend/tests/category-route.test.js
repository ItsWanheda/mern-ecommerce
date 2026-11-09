import test from "node:test";
import assert from "node:assert/strict";
import { decodeCategoryRoute, resolveCategoryRoute } from "../src/lib/category-route.js";

const categories = [
  { _id: "1", slug: "mantos", name: { fa: "مانتو", en: "Coats" } },
  { _id: "2", slug: "t-shirts", name: { fa: "تی‌شرت", en: "T-shirts" } },
];

test("decodes legacy percent-encoded and double-encoded category route values", () => {
  assert.equal(decodeCategoryRoute("%D9%85%D8%A7%D9%86%D8%AA%D9%88"), "مانتو");
  assert.equal(decodeCategoryRoute("%25D9%2585%25D8%25A7%25D9%2586%25D8%25AA%25D9%2588"), "مانتو");
});

test("resolves localized category names to the canonical stable slug", () => {
  assert.deepEqual(resolveCategoryRoute("مانتو", categories), {
    decoded: "مانتو",
    category: categories[0],
    slug: "mantos",
  });
  assert.equal(resolveCategoryRoute("Coats", categories).slug, "mantos");
});

test("preserves valid slugs and unknown route segments", () => {
  assert.equal(resolveCategoryRoute("t-shirts", categories).slug, "t-shirts");
  assert.equal(resolveCategoryRoute("unknown-category", categories).slug, "unknown-category");
});
