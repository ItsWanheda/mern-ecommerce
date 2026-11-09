import test from "node:test";
import assert from "node:assert/strict";
import { STORE_INFO_ROUTES, isStoreInfoRoute } from "../src/lib/next-route-paths.js";

test("the native store-information route set contains the six approved routes", () => {
  assert.deepEqual(STORE_INFO_ROUTES, [
    "/shipping-policy",
    "/returns-policy",
    "/support",
    "/faq",
    "/privacy-policy",
    "/terms-of-use",
  ]);
});

test("native route matching is exact and does not capture legacy storefront routes", () => {
  for (const route of STORE_INFO_ROUTES) assert.equal(isStoreInfoRoute(route), true, route);
  for (const route of ["/", "/shop", "/cart", "/login", "/newsletter-unsubscribe", "/support/contact", "support"]) {
    assert.equal(isStoreInfoRoute(route), false, route);
  }
});
