const hasLegacyArray = (value) => Array.isArray(value) && value.length > 0;

export function requiresCatalogMigration(product) {
  if (!product || typeof product !== "object") return false;
  const legacyFit = product.fit && typeof product.fit === "object" && !Array.isArray(product.fit) &&
    Object.entries(product.fit).some(([key, value]) => {
      // The old backend accidentally persisted this placeholder for products
      // that explicitly sent fit: null. It is not meaningful clothing data.
      if (key === "type" && value === "regular") return false;
      return typeof value === "string" ? value.trim().length > 0 : value !== null && value !== undefined;
    });
  return hasLegacyArray(product.variants) ||
    hasLegacyArray(product.sizes) ||
    hasLegacyArray(product.colors) ||
    hasLegacyArray(product.sizeChart) ||
    Boolean(legacyFit);
}
