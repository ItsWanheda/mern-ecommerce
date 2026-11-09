export const STORE_INFO_ROUTES = Object.freeze([
  "/shipping-policy",
  "/returns-policy",
  "/support",
  "/faq",
  "/privacy-policy",
  "/terms-of-use",
]);

export const AUTH_ROUTES = Object.freeze([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export const CUSTOMER_ROUTES = Object.freeze([
  "/profile",
  "/orders",
  "/wishlist",
]);

export const AUTH_REQUIRED_CUSTOMER_ROUTES = Object.freeze([
  "/profile",
  "/orders",
]);

export const SHOPPING_STATIC_ROUTES = Object.freeze([
  "/shop",
  "/categories",
  "/new-arrivals",
  "/bestsellers",
  "/featured-products",
  "/campaigns",
]);

const storeInfoRouteSet = new Set(STORE_INFO_ROUTES);
const authRouteSet = new Set(AUTH_ROUTES);
const customerRouteSet = new Set(CUSTOMER_ROUTES);
const protectedCustomerRouteSet = new Set(AUTH_REQUIRED_CUSTOMER_ROUTES);
const shoppingRouteSet = new Set(SHOPPING_STATIC_ROUTES);
const appRouterRouteSet = new Set([
  ...STORE_INFO_ROUTES,
  ...AUTH_ROUTES,
  ...CUSTOMER_ROUTES,
  ...SHOPPING_STATIC_ROUTES,
]);

export function isStoreInfoRoute(pathname) {
  return typeof pathname === "string" && storeInfoRouteSet.has(pathname);
}

export function isAuthRoute(pathname) {
  return typeof pathname === "string" && authRouteSet.has(pathname);
}

export function isCustomerRoute(pathname) {
  return typeof pathname === "string" && customerRouteSet.has(pathname);
}

export function isProtectedCustomerRoute(pathname) {
  return typeof pathname === "string" && protectedCustomerRouteSet.has(pathname);
}

export function isShoppingRoute(pathname) {
  if (typeof pathname !== "string") return false;
  return shoppingRouteSet.has(pathname) ||
    /^\/(?:category|looks|campaign)\/[^/]+$/.test(pathname);
}

export function isAppRouterRoute(pathname) {
  return typeof pathname === "string" &&
    (appRouterRouteSet.has(pathname) || isShoppingRoute(pathname));
}
