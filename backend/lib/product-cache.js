import { randomUUID } from "node:crypto";
import { redis } from "./redis.js";

const PRICE_BOUNDS_VERSION_KEY = "product_price_bounds_version_v1";
let cacheWarningLogged = false;

export const getProductDerivedCacheVersion = async () => {
  try {
    return (await redis.get(PRICE_BOUNDS_VERSION_KEY)) || "initial";
  } catch {
    return "redis-unavailable";
  }
};

export const invalidateProductPriceBoundsCache = async () => {
  try {
    await redis.set(PRICE_BOUNDS_VERSION_KEY, randomUUID(), "EX", 86400);
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Unable to advance product price-bounds cache version:", error.message);
      cacheWarningLogged = true;
    }
  }
};

export const invalidateProductDerivedCaches = async ({ includeFeatured = false } = {}) => {
  await invalidateProductPriceBoundsCache();
  try {
    await redis.del(
      "recommended_products_v2",
      ...Array.from({ length: 24 }, (_, index) => "bestselling_products_v2:" + (index + 1)),
      ...Array.from({ length: 24 }, (_, index) => "newest_products_v1:" + (index + 1)),
      ...(includeFeatured ? ["featured_products_v3"] : [])
    );
  } catch (error) {
    if (!cacheWarningLogged) {
      console.warn("Unable to invalidate product recommendation caches:", error.message);
      cacheWarningLogged = true;
    }
  }
};
