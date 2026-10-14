export const STORE_CURRENCY = "IRT";

const persianNumberFormat = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

const usdPriceFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const getCurrencyLabel = () => "تومان";

export const formatPrice = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${persianNumberFormat.format(Math.round(amount))} تومان`;
};

// Historical Stripe orders predate explicit currency/provider fields. Their session
// identifier is a reliable marker that the stored amount is USD, not Toman.
export const getOrderCurrency = (order) => {
  if (
    String(order?.currency ?? "").toUpperCase() === "USD" ||
    String(order?.paymentProvider ?? "").toLowerCase() === "stripe" ||
    (typeof order?.stripeSessionId === "string" && order.stripeSessionId.length > 0)
  ) {
    return "USD";
  }

  if (
    String(order?.currency ?? "").toUpperCase() === "IRT" ||
    String(order?.paymentProvider ?? "").toLowerCase() === "zarinpal"
  ) {
    return "IRT";
  }

  return null;
};

export const formatOrderPrice = (value, order) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  const currency = getOrderCurrency(order);
  if (currency === "USD") return usdPriceFormat.format(amount);
  if (currency === "IRT") return formatPrice(amount);

  return `${persianNumberFormat.format(Math.round(amount))} (واحد پول نامشخص)`;
};

export const isStockTracked = (product) =>
  typeof product?.stock === "number" && Number.isFinite(product.stock);

export const isOutOfStock = (product) => isStockTracked(product) && product.stock <= 0;
