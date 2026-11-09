export const STORE_INFO_ROUTES = Object.freeze([
  "/shipping-policy",
  "/returns-policy",
  "/support",
  "/faq",
  "/privacy-policy",
  "/terms-of-use",
]);

const storeInfoRouteSet = new Set(STORE_INFO_ROUTES);

export function isStoreInfoRoute(pathname) {
  return typeof pathname === "string" && storeInfoRouteSet.has(pathname);
}
