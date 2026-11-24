import test from "node:test";
import assert from "node:assert/strict";
import {
  getImageDataUrlByteLength,
  getProductImageSelectionMessage,
  MAX_PRODUCT_IMAGE_COUNT,
  MAX_PRODUCT_IMAGE_SIZE_BYTES,
  MAX_PRODUCT_IMAGE_TOTAL_BYTES,
  validateProductImageSelection,
} from "../src/lib/product-image-upload.js";

const pngFile = (size = 1024) => ({ type: "image/png", size });

test("accepts valid image selections within individual, count, and aggregate limits", () => {
  const files = Array.from({ length: 6 }, () => pngFile(MAX_PRODUCT_IMAGE_SIZE_BYTES));
  assert.equal(validateProductImageSelection({ files }), "");
  assert.equal(MAX_PRODUCT_IMAGE_TOTAL_BYTES, 6 * MAX_PRODUCT_IMAGE_SIZE_BYTES);
});

test("rejects more than the supported image count", () => {
  const currentImages = Array.from({ length: MAX_PRODUCT_IMAGE_COUNT }, (_, index) => "/uploads/" + index + ".png");
  assert.equal(
    validateProductImageSelection({ currentImages, files: [pngFile()] }),
    "too_many_images"
  );
});

test("rejects unsupported formats and individual images above the backend limit", () => {
  assert.equal(
    validateProductImageSelection({ files: [{ type: "image/svg+xml", size: 100 }] }),
    "invalid_file"
  );
  assert.equal(
    validateProductImageSelection({ files: [pngFile(MAX_PRODUCT_IMAGE_SIZE_BYTES + 1)] }),
    "invalid_file"
  );
});

test("counts images selected in earlier batches when enforcing the aggregate limit", () => {
  const previouslySelected = `data:image/png;base64,${Buffer.alloc(1024 * 1024).toString("base64")}`;
  assert.equal(getImageDataUrlByteLength(previouslySelected), 1024 * 1024);
  const additionalFiles = Array.from({ length: 6 }, () => pngFile(MAX_PRODUCT_IMAGE_SIZE_BYTES));
  assert.equal(
    validateProductImageSelection({ currentImages: [previouslySelected], files: additionalFiles }),
    "total_too_large"
  );
});

test("explains upload validation failures to administrators", () => {
  assert.match(getProductImageSelectionMessage("invalid_file"), /۲ مگابایت/);
  assert.match(getProductImageSelectionMessage("total_too_large"), /۱۲ مگابایت/);
  assert.match(getProductImageSelectionMessage("too_many_images"), /۸ تصویر/);
});
