const parseKnownQuantity = (value) => {
  if (typeof value === "number") return Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (typeof value === "string" && value.trim() !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0) {
    return Number(value);
  }
  return null;
};

export const getKnownProductStock = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return parseKnownQuantity(product?.stock);
  const quantities = variants.map((variant) => parseKnownQuantity(variant?.stock));
  if (quantities.some((quantity) => quantity === null)) return null;
  return quantities.reduce((total, quantity) => total + quantity, 0);
};

// Null, missing, negative, fractional, and unsafe quantities are not unlimited stock.
// Unlimited inventory is not currently an explicit product policy, so checkout must fail
// closed unless the product (or every sellable variant) has an authoritative quantity.
export const hasConfiguredInventory = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length > 0) return variants.every((variant) => parseKnownQuantity(variant?.stock) !== null);
  return parseKnownQuantity(product?.stock) !== null;
};

export const hasKnownFiniteStock = (product) => parseKnownQuantity(product?.stock) !== null;
