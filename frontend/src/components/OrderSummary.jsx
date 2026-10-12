import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, LoaderCircle, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { useCartStore } from "../stores/useCartStore";
import axios from "../lib/axios";
import { formatPrice, STORE_CURRENCY } from "../lib/commerce";

const OrderSummary = () => {
  const { total, subtotal, coupon, isCouponApplied, cart } = useCartStore();
  const [paymentConfig, setPaymentConfig] = useState({
    provider: "stripe",
    currency: STORE_CURRENCY,
    configured: false,
    loading: true,
    message: "",
  });
  const [shipping, setShipping] = useState({ shippingFee: 0, flatRate: 0, freeShippingThreshold: 0, loading: true, error: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const savings = Math.max(0, subtotal - total);
  const estimatedTotal = total + Number(shipping.shippingFee || 0);

  useEffect(() => {
    let active = true;
    axios.get("/payments/provider")
      .then(({ data }) => {
        if (!active) return;
        const configured = data.provider === "stripe"
          ? Boolean(data.configured && import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
          : Boolean(data.configured);
        const message = data.provider === "stripe" && !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
          ? "کلید عمومی Stripe در تنظیمات فرانت‌اند تعریف نشده است."
          : data.message;
        setPaymentConfig({ ...data, configured, message, loading: false });
      })
      .catch(() => {
        if (active) setPaymentConfig({
          provider: "stripe",
          currency: STORE_CURRENCY,
          configured: false,
          loading: false,
          message: "دریافت تنظیمات پرداخت ناموفق بود. لطفاً بعداً دوباره تلاش کنید.",
        });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setShipping((current) => ({ ...current, loading: true }));
    axios.get(`/shipping?subtotal=${encodeURIComponent(total)}`)
      .then(({ data }) => {
        if (active) setShipping({ ...data, loading: false, error: "" });
      })
      .catch(() => {
        if (active) setShipping({ shippingFee: 0, flatRate: 0, freeShippingThreshold: 0, loading: false, error: "دریافت قوانین ارسال ناموفق بود؛ پرداخت تا زمان مشخص‌شدن هزینه ارسال غیرفعال است." });
      });
    return () => { active = false; };
  }, [total]);

  const handlePayment = async () => {
    if (!cart.length) return toast.error("سبد خرید شما خالی است");
    if (!paymentConfig.configured) {
      return toast.error(paymentConfig.message || "درگاه پرداخت در حال حاضر آماده نیست");
    }

    setCheckoutLoading(true);
    try {
      const response = await axios.post("/payments/create-checkout-session", {
        couponCode: coupon && isCouponApplied ? coupon.code : null,
      });

      if (paymentConfig.provider === "zarinpal") {
        const redirectUrl = response.data?.redirectUrl;
        if (!redirectUrl || !redirectUrl.startsWith("https://")) {
          throw new Error("نشانی امن درگاه پرداخت دریافت نشد");
        }
        window.location.assign(redirectUrl);
        return;
      }

      const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) throw new Error("کلید عمومی Stripe در تنظیمات فرانت‌اند تعریف نشده است");
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(publishableKey);
      if (!stripe) throw new Error("راه‌اندازی Stripe ناموفق بود");
      const result = await stripe.redirectToCheckout({ sessionId: response.data.id });
      if (result.error) throw result.error;
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "شروع پرداخت ناموفق بود");
      setCheckoutLoading(false);
    }
  };

  return (
    <motion.div
      dir="rtl"
      className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xl font-semibold text-emerald-400">خلاصه سفارش</p>

      <div className="space-y-4">
        <div className="space-y-3">
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-sm font-normal text-gray-300">قیمت محصولات</dt>
            <dd dir="ltr" className="text-sm font-medium text-white">{formatPrice(subtotal, paymentConfig.currency)}</dd>
          </dl>

          {savings > 0 && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-sm font-normal text-gray-300">تخفیف {coupon && isCouponApplied ? `(${coupon.code})` : ""}</dt>
              <dd dir="ltr" className="text-sm font-medium text-emerald-400">−{formatPrice(savings, paymentConfig.currency)}</dd>
            </dl>
          )}

          <dl className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-2 text-sm font-normal text-gray-300"><Truck size={15} aria-hidden="true" />هزینه ارسال</dt>
            <dd dir="ltr" className="text-sm font-medium text-white">
              {shipping.loading ? "…" : shipping.shippingFee === 0 ? "رایگان" : formatPrice(shipping.shippingFee, paymentConfig.currency)}
            </dd>
          </dl>

          {shipping.error && <p role="alert" className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-sm leading-6 text-amber-200">{shipping.error}</p>}

          {shipping.freeShippingThreshold > 0 && total < shipping.freeShippingThreshold && (
            <p className="text-xs leading-5 text-gray-400">
              برای ارسال رایگان، مبلغ سفارش باید به {formatPrice(shipping.freeShippingThreshold, paymentConfig.currency)} برسد.
            </p>
          )}

          <dl className="flex items-center justify-between gap-4 border-t border-gray-600 pt-3">
            <dt className="text-base font-bold text-white">مبلغ نهایی تقریبی</dt>
            <dd dir="ltr" className="text-base font-bold text-emerald-400">{formatPrice(estimatedTotal, paymentConfig.currency)}</dd>
          </dl>
          <p className="text-xs leading-5 text-gray-400">مبلغ نهایی و موجودی کالا در سمت سرور دوباره بررسی می‌شود.</p>
        </div>

        {!paymentConfig.loading && !paymentConfig.configured && (
          <p role="alert" className="rounded-lg border border-amber-700/50 bg-amber-950/30 p-3 text-sm leading-6 text-amber-200">
            {paymentConfig.message || "درگاه پرداخت پیکربندی نشده است."}
          </p>
        )}

        <motion.button
          type="button"
          disabled={checkoutLoading || paymentConfig.loading || !paymentConfig.configured || shipping.loading || Boolean(shipping.error) || !cart.length}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300/40 disabled:cursor-not-allowed disabled:opacity-50"
          whileHover={{ scale: checkoutLoading ? 1 : 1.02 }}
          whileTap={{ scale: checkoutLoading ? 1 : 0.98 }}
          onClick={handlePayment}
        >
          {checkoutLoading || paymentConfig.loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : null}
          {checkoutLoading ? "در حال انتقال به درگاه…" : paymentConfig.provider === "zarinpal" ? "پرداخت آنلاین با زرین‌پال" : "ادامه و پرداخت"}
        </motion.button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-normal text-gray-400">یا</span>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline">
            <ArrowLeft size={16} aria-hidden="true" />ادامه خرید
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderSummary;
