const parseKnownQuantity = (value) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
};

export const getKnownProductStock = (product) => {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (variants.length === 0) return parseKnownQuantity(product?.stock);
  const quantities = variants.map((variant) => parseKnownQuantity(variant?.stock));
  if (quantities.some((quantity) => quantity === null)) return null;
  return quantities.reduce((total, quantity) => total + Math.max(0, quantity), 0);
};
