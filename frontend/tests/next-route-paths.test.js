import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_ROUTES,
  STORE_INFO_ROUTES,
  isAppRouterRoute,
  isAuthRoute,
  isStoreInfoRoute,
} from "../src/lib/next-route-paths.js";
import {
  buildAuthPagePath,
  getAuthReturnPath,
  withAuthReturnPath,
} from "../src/lib/auth-route-state.js";

test("the native store-information route set contains the six approved routes", () => {
  assert.deepEqual(STORE_INFO_ROUTES, [
    "/shipping-policy", "/returns-policy", "/support", "/faq", "/privacy-policy", "/terms-of-use",
  ]);
});

test("the native account route set contains the four authentication routes", () => {
  assert.deepEqual(AUTH_ROUTES, ["/login", "/signup", "/forgot-password", "/reset-password"]);
  for (const route of AUTH_ROUTES) {
    assert.equal(isAuthRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
});

test("native route matching is exact and does not capture unrelated legacy routes", () => {
  for (const route of STORE_INFO_ROUTES) {
    assert.equal(isStoreInfoRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  for (const route of ["/", "/shop", "/cart", "/newsletter-unsubscribe", "/support/contact", "support", "/login/extra"]) {
    assert.equal(isAppRouterRoute(route), false, route);
  }
});

test("auth return paths preserve only safe same-origin pathnames", () => {
  assert.equal(getAuthReturnPath({ state: { from: { pathname: "/profile" } }, search: "?next=%2Forders" }), "/profile");
  assert.equal(getAuthReturnPath({ search: "?next=%2Forders" }), "/orders");
  assert.equal(getAuthReturnPath({ search: "?next=https%3A%2F%2Fevil.example" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%2F%2Fevil.example" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%5C%5Cevil.example" }), "");
});

test("auth links keep the intended destination when switching between login and signup", () => {
  assert.equal(buildAuthPagePath("/signup", "/profile"), "/signup?next=%2Fprofile");
  assert.equal(buildAuthPagePath("/login", "//evil.example"), "/login");
  assert.equal(withAuthReturnPath({ pathname: "/login", search: "", hash: "", state: { from: { pathname: "/orders" } } }), "/login?next=%2Forders");
  assert.equal(withAuthReturnPath({ pathname: "/reset-password", search: "?token=abc", hash: "" }), "/reset-password?token=abc");
});
