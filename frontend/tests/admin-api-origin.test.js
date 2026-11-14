import test from "node:test";
import assert from "node:assert/strict";
import { resolveServerOrigin } from "../src/lib/admin-api-origin.js";

test("prefers the explicitly configured application origin", () => {
  assert.equal(
    resolveServerOrigin({
      appUrl: "https://shop.example.com///",
      vercelUrl: "deployment.vercel.app",
      forwardedHost: "localhost:3000",
      nodeEnv: "development",
    }),
    "https://shop.example.com",
  );
});

test("uses HTTPS for Vercel deployment URLs", () => {
  assert.equal(
    resolveServerOrigin({
      vercelUrl: "shop-git-feature.vercel.app",
      forwardedHost: "localhost:3000",
      forwardedProtocol: "http",
      nodeEnv: "development",
    }),
    "https://shop-git-feature.vercel.app",
  );
});

test("honors the reverse proxy protocol when it is provided", () => {
  assert.equal(
    resolveServerOrigin({
      forwardedHost: "shop.example.com",
      forwardedProtocol: "https, http",
      nodeEnv: "development",
    }),
    "https://shop.example.com",
  );
});

test("defaults to HTTP for local development when the proxy omits its protocol", () => {
  assert.equal(
    resolveServerOrigin({
      forwardedHost: "localhost:3000",
      nodeEnv: "development",
    }),
    "http://localhost:3000",
  );
});

test("defaults to HTTPS for production hosts when the proxy omits its protocol", () => {
  assert.equal(
    resolveServerOrigin({
      forwardedHost: "shop.example.com",
      nodeEnv: "production",
    }),
    "https://shop.example.com",
  );
});

test("falls back to local HTTP when no deployment or request host is available", () => {
  assert.equal(resolveServerOrigin({ nodeEnv: "development" }), "http://localhost:3000");
});
