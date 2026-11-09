"use client";

import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useWishlistStore } from "../stores/useWishlistStore";

const WishlistPage = () => {
  const { items, clearSaved } = useWishlistStore();

  return (
    <main dir="rtl" className="min-h-screen bg-canvas px-3 py-8 text-ink sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-[1920px]">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5 sm:mb-9 sm:pb-6">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-brand">
              <Heart size={15} aria-hidden="true" />
              مجموعه شخصی شما
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">علاقه‌مندی‌های من</h1>
            <p className="mt-2 text-sm leading-6 text-muted-soft">محصولاتی که برای خرید بعدی ذخیره کرده‌اید.</p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearSaved}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-border-strong hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Trash2 size={15} aria-hidden="true" />
              پاک‌کردن فهرست
            </button>
          )}
        </header>

        {items.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-soft" aria-live="polite">
              {new Intl.NumberFormat("fa-IR").format(items.length)} محصول ذخیره‌شده
            </p>
            <div className="grid grid-cols-2 justify-items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          </>
        ) : (
          <section className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface px-5 py-12 text-center">
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Heart size={24} aria-hidden="true" />
            </span>
            <h2 className="text-xl font-semibold">هنوز محصولی ذخیره نکرده‌اید</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-soft">
              با انتخاب آیکون قلب روی کارت هر محصول، آن را به این فهرست اضافه کنید.
            </p>
            <Link
              to="/shop"
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-strong px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-strong-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ShoppingBag size={16} aria-hidden="true" />
              دیدن محصولات
            </Link>
          </section>
        )}
      </div>
    </main>
  );
};

export default WishlistPage;
