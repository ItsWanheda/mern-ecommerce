const hasLegacyArray = (value) => Array.isArray(value) && value.length > 0;

export function requiresCatalogMigration(product) {
  if (!product || typeof product !== "object") return false;
  const legacyFit = product.fit && typeof product.fit === "object" && Object.keys(product.fit).length > 0;
  return hasLegacyArray(product.variants) ||
    hasLegacyArray(product.sizes) ||
    hasLegacyArray(product.colors) ||
    hasLegacyArray(product.sizeChart) ||
    Boolean(legacyFit);
}
