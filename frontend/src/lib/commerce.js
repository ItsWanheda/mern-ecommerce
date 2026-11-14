export const STORE_CURRENCY = "IRT";

const persianNumberFormat = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

export const getCurrencyLabel = () => "تومان";

export const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${persianNumberFormat.format(Math.round(amount))} تومان`;
};

export const isStockTracked = (product) =>
  typeof product?.stock === "number" && Number.isFinite(product.stock);

export const isOutOfStock = (product) => isStockTracked(product) && product.stock <= 0;

// Keep whole-Toman rounding aligned with backend/lib/product-pricing.js.
export const getProductDiscountPercent = (product) => {
  const percent = Number(product?.discountPercent ?? 0);
  return Number.isInteger(percent) && percent >= 0 && percent <= 99 ? percent : 0;
};

export const getProductDiscountAmount = (product) => {
  const price = Number(product?.price);
  const percent = getProductDiscountPercent(product);
  if (!Number.isSafeInteger(price) || price < 0 || percent === 0) return 0;
  return Math.min(price, Math.round(price * percent / 100));
};

export const getProductDiscountedPrice = (product) => {
  const price = Number(product?.price);
  if (!Number.isSafeInteger(price) || price < 0) return 0;
  return Math.max(0, price - getProductDiscountAmount(product));
};
