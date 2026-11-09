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

const storeInfoRouteSet = new Set(STORE_INFO_ROUTES);
const authRouteSet = new Set(AUTH_ROUTES);
const appRouterRouteSet = new Set([...STORE_INFO_ROUTES, ...AUTH_ROUTES]);

export function isStoreInfoRoute(pathname) {
  return typeof pathname === "string" && storeInfoRouteSet.has(pathname);
}

export function isAuthRoute(pathname) {
  return typeof pathname === "string" && authRouteSet.has(pathname);
}

export function isAppRouterRoute(pathname) {
  return typeof pathname === "string" && appRouterRouteSet.has(pathname);
}
