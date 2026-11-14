export const normalizeProductDiscountPercent = (value) => {
  const percent = Number(value ?? 0);
  return Number.isInteger(percent) && percent >= 0 && percent <= 99 ? percent : 0;
};

export const getProductDiscountAmount = (product) => {
  const price = Number(product?.price);
  const percent = normalizeProductDiscountPercent(product?.discountPercent);
  if (!Number.isSafeInteger(price) || price < 0 || percent === 0) return 0;
  return Math.min(price, Math.round(price * percent / 100));
};

export const getProductDiscountedPrice = (product) => {
  const price = Number(product?.price);
  if (!Number.isSafeInteger(price) || price < 0) return 0;
  return Math.max(0, price - getProductDiscountAmount(product));
};
