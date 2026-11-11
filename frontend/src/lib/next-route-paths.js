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
  "/account",
  "/profile",
  "/orders",
  "/wishlist",
]);

export const AUTH_REQUIRED_CUSTOMER_ROUTES = Object.freeze([
  "/account",
  "/profile",
  "/orders",
]);

export const CHECKOUT_ROUTES = Object.freeze([
  "/cart",
  "/purchase-success",
  "/purchase-cancel",
]);

export const NEWSLETTER_ROUTES = Object.freeze([
  "/newsletter-unsubscribe",
]);

export const ADMIN_ROUTES = Object.freeze([
  "/secret-dashboard",
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
const checkoutRouteSet = new Set(CHECKOUT_ROUTES);
const newsletterRoutesSet = new Set(NEWSLETTER_ROUTES);
const adminRouteSet = new Set(ADMIN_ROUTES);
const appRouterRouteSet = new Set([
  "/",
  ...STORE_INFO_ROUTES,
  ...AUTH_ROUTES,
  ...CUSTOMER_ROUTES,
  ...ADMIN_ROUTES,
  ...NEWSLETTER_ROUTES,
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

export function isAdminRoute(pathname) {
  return typeof pathname === "string" && adminRouteSet.has(pathname);
}

export function isNewsletterRoute(pathname) {
  return typeof pathname === "string" && newsletterRoutesSet.has(pathname);
}

export function isShoppingRoute(pathname) {
  if (typeof pathname !== "string") return false;
  return shoppingRouteSet.has(pathname) || checkoutRouteSet.has(pathname) ||
    /^\/(?:category|looks|campaign|product)\/[^/]+$/.test(pathname);
}

export function isAppRouterRoute(pathname) {
  return typeof pathname === "string" &&
    (appRouterRouteSet.has(pathname) || isShoppingRoute(pathname));
}
