"use client";

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle, PackageSearch, RefreshCw } from "lucide-react";
import axios from "../lib/axios";
import ProductCard from "../components/ProductCard";
import PageMeta from "../components/PageMeta";

const modes = {
  newest: {
    title: "تازه‌واردها",
    path: "/new-arrivals",
    load: async () => (await axios.get("/products/newest?limit=24")).data.products || [],
  },
  bestsellers: {
    title: "محبوب‌ترین‌ها",
    path: "/bestsellers",
    load: async () => {
      const { data } = await axios.get("/products/featured");
      return Array.isArray(data) ? data : [];
    },
  },
  featured: {
    title: "محبوب‌ترین‌ها",
    path: "/bestsellers",
    load: async () => {
      const { data } = await axios.get("/products/featured");
      return Array.isArray(data) ? data : [];
    },
  },
};

const CollectionPage = ({ type = "newest", slug: routeSlug }) => {
  const { slug: matchedSlug } = useParams();
  const slug = routeSlug || matchedSlug;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const config = type === "look" ? null : modes[type];

  const loadCollection = useCallback(async () => {
    if (!config) {
      setLoading(false);
      setError("این مجموعه پیدا نشد.");
      setProducts([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const loaded = await config.load?.();
      const unique = (loaded || []).filter((product, index, all) =>
        product?._id && product.isActive !== false && all.findIndex((item) => item?._id === product._id) === index
      );
      setProducts(unique);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "بارگذاری محصولات این مجموعه ناموفق بود.");
    } finally {
      setLoading(false);
    }
  }, [config, slug, type]);

  useEffect(() => { loadCollection(); }, [loadCollection]);

  return (
    <main dir="rtl" className="storefront-page min-h-[65vh] bg-[var(--ui-canvas)] px-3 py-7 text-[var(--ui-text)] sm:px-6 sm:py-10 lg:px-8">
      <PageMeta title={config?.title || "مجموعه پیدا نشد"} description={config?.title ? "محصولات این مجموعه را مشاهده کنید." : "این مجموعه در فروشگاه سخت‌افزار در دسترس نیست."} path={config?.path || "/shop"} type="collection" itemList={products} robots={config ? "index, follow, max-image-preview:large" : "noindex, nofollow"} canonical={Boolean(config)} breadcrumbs={config ? [{ name: "صفحه اصلی", path: "/" }, { name: "فروشگاه", path: "/shop" }, { name: config.title, path: config.path }] : []} />
      <div className="mx-auto max-w-[1440px]">
        <nav aria-label="مسیر صفحه" className="mb-5 flex flex-wrap items-center gap-2 text-xs text-[var(--ui-muted)]">
          <Link to="/" className="transition hover:text-[var(--ui-accent)]">صفحه اصلی</Link>
          <span aria-hidden="true">/</span>
          <Link to="/shop" className="transition hover:text-[var(--ui-accent)]">فروشگاه</Link>
          <span aria-hidden="true">/</span>
          <span className="font-semibold text-[var(--ui-text)]">{config?.title || "مجموعه"}</span>
        </nav>

        {type !== "look" && (
          <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:p-7">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{config?.title || "مجموعه"}</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="inline-flex min-h-10 items-center rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] px-3 py-2 text-xs font-semibold text-[var(--ui-text-strong)]">
                {loading ? "در حال دریافت…" : new Intl.NumberFormat("fa-IR").format(products.length) + " محصول"}
              </span>
              <Link to="/shop" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-3 py-2 text-xs font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)]">
                همه محصولات<ArrowLeft size={14} aria-hidden="true" />
              </Link>
            </div>
          </header>
        )}

        {loading ? (
          <div role="status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]">
                <div className="aspect-square animate-pulse bg-[var(--ui-surface-raised)]" />
                <div className="space-y-3 p-3"><div className="h-3 w-4/5 animate-pulse rounded-full bg-[var(--ui-surface-raised)]" /><div className="h-10 animate-pulse rounded-xl bg-[var(--ui-surface-raised)]" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <section role="alert" className="rounded-2xl border border-[var(--ui-danger-border)] bg-[var(--ui-danger-bg)] p-5 text-sm text-[var(--ui-danger)]">
            <p>{error}</p>
            <button type="button" onClick={loadCollection} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--ui-danger-border)] px-3 text-xs font-semibold">
              <RefreshCw size={14} aria-hidden="true" />تلاش دوباره
            </button>
          </section>
        ) : products.length ? (
          <>
            <div className="mb-4 text-xs text-[var(--ui-muted)]" aria-live="polite">
              {new Intl.NumberFormat("fa-IR").format(products.length)} محصول
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {products.map((product) => <ProductCard key={product._id} product={product} />)}
            </div>
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-[var(--ui-border-strong)] bg-[var(--ui-surface)] px-5 py-10 text-center">
            <PackageSearch size={29} className="mx-auto text-[var(--ui-accent)]" aria-hidden="true" />
            <h2 className="mt-4 text-base font-bold">محصولی برای نمایش در این مجموعه وجود ندارد.</h2>
            <p className="mt-2 text-xs leading-6 text-[var(--ui-muted)]">بعداً دوباره سر بزنید یا سایر محصولات فروشگاه را ببینید.</p>
            <Link to="/shop" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-[var(--ui-accent)] px-4 py-2 text-xs font-bold text-[var(--ui-button-text)]">
              مشاهده همه محصولات<ArrowLeft size={14} aria-hidden="true" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
};

export default CollectionPage;
