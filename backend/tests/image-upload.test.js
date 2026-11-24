import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ImageUploadError,
  ImageStorageError,
  deleteManagedImage,
  resolveImageReference,
  validateImageDataUrl,
} from "../lib/image-upload.js";

const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCkAAAAAASUVORK5CYII=";

test("validates image signatures and pixel dimensions rather than trusting data URL MIME", () => {
  const image = validateImageDataUrl(tinyPng, 1024);
  assert.equal(image.mime, "image/png");
  assert.equal(image.width, 1);
  assert.equal(image.height, 1);
  assert.equal(image.format, "png");
});

test("rejects malformed Base64, unsupported formats, MIME spoofing, and oversized content", () => {
  assert.throws(() => validateImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="), ImageUploadError);
  assert.throws(() => validateImageDataUrl("data:image/png;base64,not valid!"), ImageUploadError);
  assert.throws(() => validateImageDataUrl(tinyPng, 8), ImageUploadError);
  assert.throws(() => validateImageDataUrl(tinyPng.replace("image/png", "image/jpeg")), ImageUploadError);
});

test("stores a validated image locally and returns a stable public path", async () => {
  const storageDir = await mkdtemp(path.join(tmpdir(), "hardware-store-images-"));
  try {
    const imagePath = await resolveImageReference(tinyPng, {
      folder: "categories",
      maxBytes: 1024,
      storageDir,
    });
    assert.match(imagePath, /^\/uploads\/categories\/[a-f\d]{32}\.png$/);

    const filename = imagePath.split("/").pop();
    const storedBytes = await readFile(path.join(storageDir, "categories", filename));
    assert.equal(storedBytes.toString("base64"), tinyPng.split(",")[1]);

    assert.equal(await deleteManagedImage(imagePath, { folder: "categories", storageDir }), true);
    assert.equal(await deleteManagedImage(imagePath, { folder: "categories", storageDir }), false);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("rejects invalid storage folders and unsafe remote references", async () => {
  await assert.rejects(
    resolveImageReference(tinyPng, { folder: "../outside" }),
    ImageUploadError
  );
  for (const value of [
    "http://example.com/image.png",
    "//evil.example/image.png",
    "javascript:alert(1)",
    "https://user:pass@example.com/image.png",
  ]) {
    await assert.rejects(resolveImageReference(value), ImageUploadError);
  }
});

test("does not delete files outside the requested managed upload folder", async () => {
  const storageDir = await mkdtemp(path.join(tmpdir(), "hardware-store-images-"));
  try {
    assert.equal(
      await deleteManagedImage("/uploads/products/0123456789abcdef0123456789abcdef.png", {
        folder: "categories",
        storageDir,
      }),
      false
    );
    assert.equal(
      await deleteManagedImage("/uploads/products/../categories/0123456789abcdef0123456789abcdef.png", {
        folder: "products",
        storageDir,
      }),
      false
    );
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
});

test("keeps existing local image paths and trusted HTTPS references unchanged", async () => {
  assert.equal(await resolveImageReference("/images/category.webp"), "/images/category.webp");
  assert.equal(await resolveImageReference("https://images.example.ir/campaign.webp"), "https://images.example.ir/campaign.webp");
});

test("wraps local filesystem failures without leaking operating-system details", async () => {
  const storageRoot = await mkdtemp(path.join(tmpdir(), "hardware-store-images-"));
  const storageFile = path.join(storageRoot, "not-a-directory");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(storageFile, "occupied");
  try {
    await assert.rejects(
      resolveImageReference(tinyPng, { folder: "products", storageDir: storageFile }),
      (error) => error instanceof ImageStorageError && !error.message.includes(storageFile)
    );
  } finally {
    await rm(storageRoot, { recursive: true, force: true });
  }
});
