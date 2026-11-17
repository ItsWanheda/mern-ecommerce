import test from "node:test";
import assert from "node:assert/strict";
import { optimizeCloudinaryImageUrl } from "../src/lib/image-optimization.js";

test("adds automatic format, quality, and bounded width to Cloudinary uploads", () => {
  assert.equal(
    optimizeCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/v123/products/item.jpg", 640),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_640/v123/products/item.jpg"
  );
});

test("preserves existing crop and width transformations while adding missing automatic options", () => {
  assert.equal(
    optimizeCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/c_fill,w_500/v123/item.jpg", 900),
    "https://res.cloudinary.com/demo/image/upload/c_fill,w_500,f_auto,q_auto/v123/item.jpg"
  );
});

test("clamps requested widths to safe limits", () => {
  assert.equal(
    optimizeCloudinaryImageUrl("https://res.cloudinary.com/demo/image/upload/v123/item.jpg", 9000),
    "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_2400/v123/item.jpg"
  );
});

test("does not rewrite signed Cloudinary or external image URLs", () => {
  const signed = "https://res.cloudinary.com/demo/image/upload/s--signature--/v123/item.jpg";
  const external = "https://images.example.com/item.jpg";
  assert.equal(optimizeCloudinaryImageUrl(signed, 640), signed);
  assert.equal(optimizeCloudinaryImageUrl(external, 640), external);
  assert.equal(optimizeCloudinaryImageUrl("/local/item.webp", 640), "/local/item.webp");
});
