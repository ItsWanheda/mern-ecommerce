import test from "node:test";
import assert from "node:assert/strict";
import {
  absoluteUrlFor,
  STATIC_PAGE_META,
  PRIVATE_ROUTE_META,
  buildProductStructuredData,
  buildSiteStructuredData,
  canonicalUrlFor,
  canonicalUrlForQuery,
  getSchemaAvailability,
  normalizeSeoText,
  hasIndexExcludedQuery,
} from "../src/lib/seo-utils.js";
import { getCanonicalOrigin } from "../lib/seo-server-utils.js";

test("static and private metadata contain the expected canonical route entries", () => {
  assert.equal(STATIC_PAGE_META["/campaigns"].title, "پیشنهادهای ویژه و کمپین‌های فروش");
  assert.equal(PRIVATE_ROUTE_META["/newsletter-unsubscribe"].title, "لغو عضویت خبرنامه");
  assert.equal(PRIVATE_ROUTE_META["/secret-dashboard"].title, "پنل مدیریت");
});

test("SEO text collapses whitespace without damaging Persian text", () => {
  assert.equal(normalizeSeoText("  پردازنده\n\n   قدرتمند  ", "fallback", 100), "پردازنده قدرتمند");
  assert.equal(normalizeSeoText("", "fallback text", 8), "fallback");
  assert.equal(normalizeSeoText("الف   ب", "", 3), "الف");
});

test("canonical URLs use the configured origin and discard query/hash duplicates", () => {
  assert.equal(
    canonicalUrlFor("/category/graphics-cards?memory_gb=16#specifications", "https://preview.example", "https://shop.example/path/"),
    "https://shop.example/category/graphics-cards"
  );
  assert.equal(canonicalUrlFor("//evil.example/path", "https://shop.example"), "https://shop.example/");
});

test("pagination gets a page-specific canonical while filters stay excluded", () => {
  assert.equal(
    canonicalUrlForQuery("/category/graphics-cards", { page: "2", type: "category", id: "graphics-cards" }, "https://preview.example", "https://shop.example"),
    "https://shop.example/category/graphics-cards?page=2"
  );
  assert.equal(
    canonicalUrlForQuery("/category/graphics-cards", { page: "2", q: "graphics", type: "category", id: "graphics-cards" }, "https://shop.example"),
    "https://shop.example/category/graphics-cards"
  );
  assert.equal(hasIndexExcludedQuery({ page: "2" }), false);
  assert.equal(hasIndexExcludedQuery({ page: "2", q: "graphics" }), true);
  assert.equal(hasIndexExcludedQuery({ sort: "newest" }), false);
  assert.equal(hasIndexExcludedQuery({ sort: "priceAsc" }), true);
});

test("organization markup uses OnlineStore and only a configured valid support contact", () => {
  const withoutContact = buildSiteStructuredData("https://shop.example");
  assert.equal(withoutContact[0]["@type"], "OnlineStore");
  assert.equal(withoutContact[0].url, "https://shop.example/");
  assert.equal(withoutContact[0].contactPoint, undefined);

  const withContact = buildSiteStructuredData("https://shop.example", { supportEmail: "support@example.com" });
  assert.deepEqual(withContact[0].contactPoint, {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "support@example.com",
  });
  const invalidContact = buildSiteStructuredData("https://shop.example", { supportEmail: "not-an-email" });
  assert.equal(invalidContact[0].contactPoint, undefined);
});

test("server canonicals fail closed unless a production origin is known", () => {
  const keys = ["PUBLIC_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_ENV"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    delete process.env.PUBLIC_SITE_URL;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_ENV = "production";
    assert.equal(getCanonicalOrigin("https://arbitrary-host.example"), "");

    process.env.VERCEL_PROJECT_PRODUCTION_URL = "shop.example";
    assert.equal(getCanonicalOrigin("https://preview.example"), "https://shop.example");
    process.env.PUBLIC_SITE_URL = "https://www.shop.example/";
    assert.equal(getCanonicalOrigin("https://preview.example"), "https://www.shop.example");
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("relative images become absolute, safe HTTP(S) URLs", () => {
  assert.equal(absoluteUrlFor("/images/processor.jpg", "https://shop.example/path"), "https://shop.example/images/processor.jpg");
  assert.equal(absoluteUrlFor("javascript:alert(1)", "https://shop.example"), "");
  assert.equal(absoluteUrlFor("", "https://shop.example"), "");
});

test("untracked stock does not produce a falsely available Product Offer", () => {
  const schema = buildProductStructuredData({
    product: { _id: "abc123", name: "کارت گرافیک", price: 125000, stock: null, description: "کارت گرافیک با حافظه ۱۶ گیگابایت" },
    title: "کارت گرافیک",
    description: "جزئیات محصول",
    image: "/hardware/gpu.jpg",
    canonical: "https://shop.example/product/abc123",
    origin: "https://shop.example",
  });
  assert.equal(schema.name, "کارت گرافیک");
  assert.equal(schema.offers, undefined);
  assert.deepEqual(schema.image, ["https://shop.example/hardware/gpu.jpg"]);
});

test("tracked stock is reflected in Product Offer availability", () => {
  const schema = buildProductStructuredData({
    product: {
      _id: "abc123",
      name: "کارت گرافیک RTX 5070",
      price: 125000,
      stock: 0,
      sku: "GPU-5070",
      brand: "NVIDIA",
      category: "کارت گرافیک",
      attributes: { memory_gb: 16, interface: "pcie-5", ray_tracing: true },
    },
    title: "کارت گرافیک",
    description: "جزئیات محصول",
    canonical: "https://shop.example/product/abc123",
    origin: "https://shop.example",
  });
  assert.equal(schema.offers.priceCurrency, "IRR");
  assert.equal(schema.offers.price, 1250000);
  assert.equal(schema.offers.availability, "https://schema.org/OutOfStock");
  assert.equal(schema.sku, "GPU-5070");
  assert.deepEqual(schema.brand, { "@type": "Brand", name: "NVIDIA" });
  assert.equal(schema.category, "کارت گرافیک");
  assert.equal(schema.url, "https://shop.example/product/abc123");
  assert.equal(schema.mainEntityOfPage["@id"], "https://shop.example/product/abc123");
  assert.deepEqual(schema.additionalProperty, [
    { "@type": "PropertyValue", name: "memory gb", value: "16" },
    { "@type": "PropertyValue", name: "interface", value: "pcie-5" },
    { "@type": "PropertyValue", name: "ray tracing", value: "true" },
  ]);
});

test("variant availability reflects whether at least one combination is purchasable", () => {
  assert.equal(getSchemaAvailability({ variants: [{ stock: 0 }, { stock: 2 }] }), "https://schema.org/InStock");
  assert.equal(getSchemaAvailability({ variants: [{ stock: 0 }], stock: null }), "https://schema.org/OutOfStock");
  assert.equal(getSchemaAvailability({ isActive: false, stock: 5 }), "https://schema.org/Discontinued");
});
