"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import CartItem from "../components/CartItem";
import PeopleAlsoBought from "../components/PeopleAlsoBought";
import OrderSummary from "../components/OrderSummary";

const number = (value) => new Intl.NumberFormat("fa-IR").format(value);

const CartPage = () => {
  const { cart } = useCartStore();
  const itemCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <main dir="rtl" className="storefront-page min-h-screen bg-[var(--ui-canvas)] px-3 py-7 pb-12 text-[var(--ui-text)] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1440px]">
        <nav aria-label="مسیر صفحه" className="mb-5 flex items-center gap-2 text-xs text-[var(--ui-muted)]">
          <Link to="/" className="transition hover:text-[var(--ui-accent)]">صفحه اصلی</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="font-semibold text-[var(--ui-text)]">سبد خرید</span>
        </nav>

        <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-xs font-bold text-[var(--ui-accent)]">مرحله قبل از ثبت سفارش</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">سبد خرید شما</h1>
            <p className="mt-2 text-xs leading-6 text-[var(--ui-muted)]">
              {cart.length ? number(itemCount) + " عدد کالا در سبد شما قرار دارد." : "محصولات موردنظرتان را به سبد اضافه کنید و سفارش را ادامه دهید."}
            </p>
          </div>
          <Link to="/shop" className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-4 py-2 text-xs font-semibold text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-hover)] sm:self-auto">
            ادامه خرید<ArrowLeft size={15} aria-hidden="true" />
          </Link>
        </header>

        {cart.length === 0 ? (
          <EmptyCartUI />
        ) : (
          <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] lg:gap-6">
            <motion.section
              aria-label="کالاهای سبد خرید"
              className="min-w-0 space-y-3 sm:space-y-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center justify-between gap-3 px-1">
                <h2 className="text-sm font-bold text-[var(--ui-text)]">کالاهای انتخاب‌شده</h2>
                <span className="text-xs text-[var(--ui-muted)]">{number(cart.length)} ردیف کالا</span>
              </div>
              {cart.map((item) => (
                <CartItem key={item.cartItemId || (item._id + "-" + (item.selectedSize || "") + "-" + (item.selectedColor || ""))} item={item} />
              ))}
              <div className="hidden lg:block">
                <PeopleAlsoBought />
              </div>
            </motion.section>

            <motion.aside
              className="min-w-0 lg:sticky lg:top-28"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <OrderSummary />
            </motion.aside>
            <div className="lg:hidden">
              <PeopleAlsoBought />
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

const EmptyCartUI = () => (
  <motion.section
    className="flex min-h-[19rem] flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-5 py-12 text-center"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]">
      <ShoppingCart size={29} aria-hidden="true" />
    </span>
    <h2 className="mt-4 text-lg font-extrabold">سبد خرید شما خالی است</h2>
    <p className="mt-2 max-w-sm text-xs leading-7 text-[var(--ui-muted)]">هنوز محصولی به سبد خرید اضافه نکرده‌اید. از فروشگاه دیدن کنید و کالاهای موردنیازتان را انتخاب کنید.</p>
    <Link to="/shop" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-5 py-2.5 text-sm font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)]">
      شروع خرید<ArrowLeft size={16} aria-hidden="true" />
    </Link>
  </motion.section>
);

export default CartPage;
