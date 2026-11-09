import test from "node:test";
import assert from "node:assert/strict";
import {
  AUTH_ROUTES,
  ADMIN_ROUTES,
  NEWSLETTER_ROUTES,
  AUTH_REQUIRED_CUSTOMER_ROUTES,
  CHECKOUT_ROUTES,
  SHOPPING_STATIC_ROUTES,
  CUSTOMER_ROUTES,
  STORE_INFO_ROUTES,
  isAppRouterRoute,
  isAdminRoute,
  isNewsletterRoute,
  isAuthRoute,
  isCustomerRoute,
  isProtectedCustomerRoute,
  isShoppingRoute,
  isStoreInfoRoute,
} from "../src/lib/next-route-paths.js";
import {
  buildAuthPagePath,
  getAuthReturnPath,
  withAuthReturnPath,
} from "../src/lib/auth-route-state.js";

test("the native newsletter unsubscribe route is exact", () => {
  assert.deepEqual(NEWSLETTER_ROUTES, ["/newsletter-unsubscribe"]);
  assert.equal(isNewsletterRoute("/newsletter-unsubscribe"), true);
  assert.equal(isAppRouterRoute("/newsletter-unsubscribe"), true);
  for (const route of ["/newsletter-unsubscribe/extra", "/newsletter", "/newsletter-unsubscribe/"]) {
    assert.equal(isNewsletterRoute(route), false, route);
    assert.equal(isAppRouterRoute(route), false, route);
  }
});

test("the native admin route is exact and remains separate from customer routes", () => {
  assert.deepEqual(ADMIN_ROUTES, ["/secret-dashboard"]);
  assert.equal(isAdminRoute("/secret-dashboard"), true);
  assert.equal(isAppRouterRoute("/secret-dashboard"), true);
  for (const route of ["/secret-dashboard/settings", "/secret-dashboard/anything", "/secret-dashboard/"]) {
    assert.equal(isAdminRoute(route), false, route);
    assert.equal(isAppRouterRoute(route), false, route);
  }
});

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

test("the native customer route set preserves the guest wishlist and protected pages", () => {
  assert.deepEqual(CUSTOMER_ROUTES, ["/profile", "/orders", "/wishlist"]);
  assert.deepEqual(AUTH_REQUIRED_CUSTOMER_ROUTES, ["/profile", "/orders"]);
  for (const route of CUSTOMER_ROUTES) {
    assert.equal(isCustomerRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  assert.equal(isProtectedCustomerRoute("/profile"), true);
  assert.equal(isProtectedCustomerRoute("/orders"), true);
  assert.equal(isProtectedCustomerRoute("/wishlist"), false);
});

test("native shopping routes include static discovery and exact dynamic detail paths", () => {
  assert.deepEqual(SHOPPING_STATIC_ROUTES, [
    "/shop", "/categories", "/new-arrivals", "/bestsellers", "/featured-products", "/campaigns",
  ]);
  for (const route of SHOPPING_STATIC_ROUTES) {
    assert.equal(isShoppingRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  for (const route of ["/category/jeans", "/category/outerwear%20for%20winter", "/looks/daily-style", "/campaign/65abc123", "/product/65abc123abcdef1234567890"]) {
    assert.equal(isShoppingRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  for (const route of ["/category", "/category/jeans/extra", "/looks/a/b", "/campaigns/active", "/campaign/", "/product", "/product/a/b"]) {
    assert.equal(isShoppingRoute(route), false, route);
    assert.equal(isAppRouterRoute(route), false, route);
  }
});

test("native route matching is exact and does not capture unrelated legacy routes", () => {
  for (const route of STORE_INFO_ROUTES) {
    assert.equal(isStoreInfoRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  for (const route of ["/", "/newsletter-unsubscribe", "/support/contact", "support", "/login/extra", "/profiles", "/orders/archive"]) {
    assert.equal(isAppRouterRoute(route), false, route);
  }
});

test("auth return paths preserve only safe same-origin pathnames", () => {
  assert.equal(getAuthReturnPath({ state: { from: { pathname: "/profile" } }, search: "?next=%2Forders" }), "/profile");
  assert.equal(getAuthReturnPath({ search: "?next=%2Forders" }), "/orders");
  assert.equal(getAuthReturnPath({ search: "?next=https%3A%2F%2Fevil.example" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%2F%2Fevil.example" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%5C%5Cevil.example" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%2Flogin" }), "");
  assert.equal(getAuthReturnPath({ search: "?next=%2Fsignup" }), "");
});

test("auth links keep the intended destination when switching between login and signup", () => {
  assert.equal(buildAuthPagePath("/signup", "/profile"), "/signup?next=%2Fprofile");
  assert.equal(buildAuthPagePath("/login", "//evil.example"), "/login");
  assert.equal(withAuthReturnPath({ pathname: "/login", search: "", hash: "", state: { from: { pathname: "/orders" } } }), "/login?next=%2Forders");
  assert.equal(withAuthReturnPath({ pathname: "/login", search: "?next=%2Forders", hash: "", state: { from: { pathname: "/profile" } } }), "/login?next=%2Fprofile");
  assert.equal(withAuthReturnPath({ pathname: "/reset-password", search: "?token=abc", hash: "" }), "/reset-password?token=abc");
});


test("native checkout routes include cart and verified payment result pages", () => {
  assert.deepEqual(CHECKOUT_ROUTES, ["/cart", "/purchase-success", "/purchase-cancel"]);
  for (const route of CHECKOUT_ROUTES) {
    assert.equal(isShoppingRoute(route), true, route);
    assert.equal(isAppRouterRoute(route), true, route);
  }
  for (const route of ["/purchase", "/purchase-success/extra", "/cart/items"]) {
    assert.equal(isShoppingRoute(route), false, route);
    assert.equal(isAppRouterRoute(route), false, route);
  }
});
