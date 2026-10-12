const configuredCurrency = import.meta.env.VITE_STORE_CURRENCY || "USD";

export const STORE_CURRENCY = String(configuredCurrency).toUpperCase();

export const formatPrice = (value, currency = STORE_CURRENCY) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  const normalizedCurrency = String(currency || "USD").toUpperCase();
  if (normalizedCurrency === "IRT") {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Math.round(amount))} تومان`;
  }
  if (normalizedCurrency === "IRR") {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Math.round(amount))} ریال`;
  }

  return new Intl.NumberFormat("fa-IR", {
    style: "currency",
    currency: normalizedCurrency === "USD" ? "USD" : normalizedCurrency,
    minimumFractionDigits: normalizedCurrency === "USD" ? 2 : 0,
    maximumFractionDigits: normalizedCurrency === "USD" ? 2 : 0,
  }).format(amount);
};

export const isStockTracked = (product) =>
  typeof product?.stock === "number" && Number.isFinite(product.stock);

export const isOutOfStock = (product) => isStockTracked(product) && product.stock <= 0;
