"use client";

import { ArrowRight, CheckCircle, HandHeart, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import axios from "../lib/axios";
import Confetti from "react-confetti";

const PurchaseSuccessPage = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");
  const { clearCart } = useCartStore();

  useEffect(() => {
    let active = true;
    const verifyReturn = async () => {
      const params = new URLSearchParams(window.location.search);
      const zarinpalOrderId = params.get("order_id");

      try {
        if (!zarinpalOrderId) throw new Error("شناسه سفارش در نشانی صفحه پیدا نشد");
        const { data } = await axios.get(`/payments/zarinpal/order/${encodeURIComponent(zarinpalOrderId)}`);
        if (!data.paid) throw new Error("وضعیت پرداخت این سفارش هنوز تأیید نشده است.");
        if (active) {
          setOrderId(String(data.orderId));
          clearCart();
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || requestError.message || "امکان تأیید پرداخت وجود نداشت. لطفاً با پشتیبانی تماس بگیرید.");
      } finally {
        if (active) setIsProcessing(false);
      }
    };
    verifyReturn();
    return () => { active = false; };
  }, [clearCart]);

  if (isProcessing) {
    return <main dir="rtl" className="storefront-page flex min-h-screen items-center justify-center bg-[var(--ui-canvas)] px-4 text-[var(--ui-text)]"><div role="status" className="flex items-center gap-3 text-sm"><LoaderCircle className="animate-spin text-[var(--ui-accent)]" size={20} aria-hidden="true" />در حال بررسی وضعیت پرداخت…</div></main>;
  }

  if (error) {
    return (
      <main dir="rtl" className="storefront-page flex min-h-[70vh] items-center justify-center bg-[var(--ui-canvas)] px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-8 text-center shadow-[0_20px_55px_-42px_var(--ui-shadow-color)]">
          <h1 className="mb-4 text-2xl font-bold text-red-400">تأیید پرداخت ناموفق بود</h1>
          <p role="alert" className="mb-6 leading-7 text-[var(--ui-muted)]">{error}</p>
          <Link to="/cart" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--ui-surface-raised)] px-5 py-2 text-brand transition hover:bg-gray-600">بازگشت به سبد خرید</Link>
        </div>
      </main>
    );
  }

  return (
    <main dir="rtl" className="storefront-page flex min-h-[75vh] items-center justify-center bg-[var(--ui-canvas)] px-4 py-12">
      <Confetti width={window.innerWidth} height={window.innerHeight} gravity={0.1} style={{ zIndex: 99 }} numberOfPieces={350} recycle={false} />
      <section className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] shadow-[0_20px_55px_-42px_var(--ui-shadow-color)]">
        <div className="p-6 sm:p-8">
          <div className="flex justify-center"><CheckCircle className="mb-4 h-16 w-16 text-[var(--ui-accent)]" aria-hidden="true" /></div>
          <h1 className="mb-3 text-center text-2xl font-bold text-[var(--ui-accent)] sm:text-3xl">پرداخت با موفقیت تأیید شد</h1>
          <p className="mb-6 text-center leading-7 text-[var(--ui-muted)]">از سفارش شما سپاسگزاریم. پرداخت توسط سرور تأیید شده است.</p>
          <div className="mb-6 space-y-3 rounded-xl bg-[var(--ui-surface-raised)] p-4">
            {orderId && <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm text-[var(--ui-muted)]">شماره سفارش</span><span dir="ltr" className="break-all text-sm font-semibold text-[var(--ui-accent)]">{orderId}</span></div>}
            <div className="flex items-center justify-between gap-2"><span className="text-sm text-[var(--ui-muted)]">وضعیت پرداخت</span><span className="text-sm font-semibold text-[var(--ui-accent)]">تأیید شد</span></div>
            <p className="text-xs leading-5 text-[var(--ui-muted)]">برای جزئیات ارسال، اطلاعات تکمیلی سفارش از سوی فروشگاه اعلام می‌شود.</p>
          </div>
          <div className="space-y-3">
            <div className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--ui-border-strong)] px-4 text-sm font-semibold text-[var(--ui-text-strong)]"><HandHeart size={18} aria-hidden="true" />از اعتماد شما سپاسگزاریم</div>
            <Link to="/" className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ui-accent)] px-4 py-2 text-sm font-semibold text-[var(--ui-button-text)] transition hover:bg-strong-hover">ادامه خرید<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
        </div>
      </section>
    </main>
  );
};
export default PurchaseSuccessPage;
