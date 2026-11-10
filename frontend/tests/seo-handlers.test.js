import test from "node:test";
import assert from "node:assert/strict";
import robotsHandler from "../api/robots.js";
import sitemapHandler from "../api/sitemap.js";
import sitemapProductsHandler from "../api/sitemap-products.js";
import sitemapStaticHandler from "../api/sitemap-static.js";

const SHOP_ORIGIN = "https://shop.example";
const API_ORIGIN = "https://api.example";

const product = {
  _id: "64f123456789abcdef123456",
  name: "کارت گرافیک RTX 5070",
  isActive: true,
  createdAt: "2026-10-01T10:00:00.000Z",
  updatedAt: "2026-10-10T10:00:00.000Z",
};

const category = {
  slug: "graphics-cards",
  name: { fa: "کارت گرافیک" },
  isActive: true,
  updatedAt: "2026-10-10T10:00:00.000Z",
};

const campaign = {
  slug: "new-sale",
  title: "پیشنهاد ویژه",
  isActive: true,
  updatedAt: "2026-10-10T10:00:00.000Z",
};

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body == null ? "" : String(body);
      return this;
    },
  };
}

function createRequest(path, query = {}, method = "GET") {
  return {
    method,
    headers: { host: "preview.example", "x-forwarded-proto": "https" },
    url: path,
    query,
  };
}

async function withSeoEnvironment(run) {
  const keys = ["PUBLIC_SITE_URL", "NEXT_PUBLIC_PUBLIC_SITE_URL", "API_BASE_URL", "VERCEL_ENV", "VERCEL_PROJECT_PRODUCTION_URL"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  process.env.PUBLIC_SITE_URL = SHOP_ORIGIN;
  process.env.API_BASE_URL = API_ORIGIN + "/api";
  delete process.env.NEXT_PUBLIC_PUBLIC_SITE_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;

  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    if (url.origin !== API_ORIGIN || !url.pathname.startsWith("/api/")) {
      throw new Error("Unexpected test fetch URL: " + url.toString());
    }
    if (url.pathname === "/api/products/search") {
      return Response.json({ products: [product], pagination: { totalPages: 2 } });
    }
    if (url.pathname === "/api/categories") return Response.json({ categories: [category] });
    if (url.pathname === "/api/campaigns") return Response.json({ campaigns: [campaign] });
    return Response.json({ message: "Not found" }, { status: 404 });
  };

  try {
    return await run();
  } finally {
    globalThis.fetch = previousFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("robots.txt exposes the verified canonical sitemap URL", async () => {
  await withSeoEnvironment(async () => {
    const response = createResponse();
    await robotsHandler(createRequest("/robots.txt"), response);
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /User-agent: \*/);
    assert.match(response.body, /Sitemap: https:\/\/shop\.example\/sitemap\.xml/);
    assert.match(response.headers["Content-Type"], /text\/plain/);
  });
});

test("sitemap index lists the static map and each product page segment", async () => {
  await withSeoEnvironment(async () => {
    const response = createResponse();
    await sitemapHandler(createRequest("/sitemap.xml"), response);
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /<sitemapindex/);
    assert.match(response.body, /https:\/\/shop\.example\/sitemap-static\.xml/);
    assert.match(response.body, /https:\/\/shop\.example\/sitemap-products\.xml\?page=1/);
    assert.match(response.body, /https:\/\/shop\.example\/sitemap-products\.xml\?page=2/);
  });
});

test("static sitemap includes native pages, active resources and Admin-managed categories", async () => {
  await withSeoEnvironment(async () => {
    const response = createResponse();
    await sitemapStaticHandler(createRequest("/sitemap-static.xml"), response);
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /https:\/\/shop\.example\//);
    assert.match(response.body, /https:\/\/shop\.example\/category\/graphics-cards/);
    assert.doesNotMatch(response.body, /https:\/\/shop\.example\/category\/(?:jeans|t-shirts|shoes|glasses|jackets|suits|bags)/);
    assert.match(response.body, /https:\/\/shop\.example\/campaign\/new-sale/);
    assert.doesNotMatch(response.body, /https:\/\/shop\.example\/(?:cart|login|secret-dashboard|profile|orders)(?:<|\/)/);
  });
});

test("product sitemap emits canonical product URLs and validated last-modified dates", async () => {
  await withSeoEnvironment(async () => {
    const response = createResponse();
    await sitemapProductsHandler(createRequest("/sitemap-products.xml", { page: "1" }), response);
    assert.equal(response.statusCode, 200);
    assert.match(response.body, /<urlset/);
    assert.match(response.body, /https:\/\/shop\.example\/product\/64f123456789abcdef123456/);
    assert.match(response.body, /<lastmod>2026-10-10T10:00:00\.000Z<\/lastmod>/);
  });
});
