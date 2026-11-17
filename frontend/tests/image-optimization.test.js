import test from "node:test";
import assert from "node:assert/strict";
import { optimizeCloudinaryImageUrl } from "../src/lib/image-optimization.js";

test("adds automatic format and quality to ordinary Cloudinary uploads", () => {
  assert.equal(
    optimizeCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/v123/products/item.jpg"),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v123/products/item.jpg"
  );
});

test("preserves existing transformations and adds only missing automatic options", () => {
  assert.equal(
    optimizeCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/c_fill,w_500/v123/item.jpg"),
    "https://res.cloudinary.com/demo/image/upload/c_fill,w_500,f_auto,q_auto/v123/item.jpg"
  );
});

test("does not rewrite signed Cloudinary or external image URLs", () => {
  const signed = "https://res.cloudinary.com/demo/image/upload/s--signature--/v123/item.jpg";
  const external = "https://images.example.com/item.jpg";
  assert.equal(optimizeCloudinaryImageUrl(signed), signed);
  assert.equal(optimizeCloudinaryImageUrl(external), external);
  assert.equal(optimizeCloudinaryImageUrl("/local/item.webp"), "/local/item.webp");
});
