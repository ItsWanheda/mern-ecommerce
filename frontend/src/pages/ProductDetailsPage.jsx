import { useEffect, useMemo, useState } from "react";
import PageMeta from "../components/PageMeta";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Heart, LoaderCircle, Ruler, ShoppingCart,
  X, Shirt,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import { formatPrice, isOutOfStock, isStockTracked } from "../lib/commerce";

const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };
const fitLabels = {
  "true-to-size": "مطابق سایز استاندارد",
  slim: "جذب",
  regular: "معمولی",
  relaxed: "آزاد",
  oversized: "آزاد و اورسایز",
  athletic: "ورزشی",
};
const measurementLabels = [
  ["chestCm", "دور سینه"],
  ["waistCm", "دور کمر"],
  ["hipsCm", "دور باسن"],
  ["lengthCm", "قد لباس"],
];

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const { addToCart } = useCartStore();
  const { isSaved, toggleSaved } = useWishlistStore();
  const isWishlisted = Boolean(product && isSaved(product._id));

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      setLoading(true); setError(""); setProduct(null);
      try {
        const response = await axios.get("/products/" + productId);
        if (active) {
          const nextProduct = response.data;
          setProduct(nextProduct);
          const variants = Array.isArray(nextProduct.variants) ? nextProduct.variants : [];
          const firstAvailable = variants.find((variant) => variant.stock > 0) || variants[0];
          const sizes = Array.isArray(nextProduct.sizes) && nextProduct.sizes.length
            ? nextProduct.sizes : [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
          const colors = Array.isArray(nextProduct.colors) && nextProduct.colors.length
            ? nextProduct.colors : [...new Set(variants.map((variant) => variant.color).filter(Boolean))]
                .map((name) => ({ name, hex: "#d5d0c5" }));
          setSelectedSize(firstAvailable?.size || sizes[0] || "");
          setSelectedColor(firstAvailable?.color || colors[0]?.name || "");
          setActiveImageIndex(0);
          setSizeGuideOpen(false);
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "بارگذاری این محصول انجام نشد. لطفاً دوباره تلاش کنید.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [productId]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const candidates = [...(Array.isArray(product.images) ? product.images : []), product.image];
    return [...new Set(candidates.filter((image) => typeof image === "string" && image.trim()))];
  }, [product]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const sizes = product?.sizes?.length
    ? product.sizes
    : [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
  const colors = product?.colors?.length
    ? product.colors
    : [...new Set(variants.map((variant) => variant.color).filter(Boolean))].map((name) => ({ name, hex: "#d5d0c5" }));
  const selectedVariant = hasVariants
    ? variants.find((variant) => (variant.size || "") === selectedSize && (variant.color || "") === selectedColor)
    : null;
  const selectedStock = selectedVariant ? selectedVariant.stock : product?.stock;
  const outOfStock = hasVariants
    ? !selectedVariant || selectedVariant.stock <= 0
    : isOutOfStock(product);
  const hasStockValue = typeof selectedStock === "number" && Number.isFinite(selectedStock);

  const hasAnyStockForSize = (size) => variants.some((variant) => variant.size === size && variant.stock > 0);
  const hasAnyStockForColor = (color) => variants.some((variant) => variant.color === color && variant.stock > 0);
  const hasStockForSize = (size) => variants.some((variant) => variant.size === size && variant.color === selectedColor && variant.stock > 0);
  const hasStockForColor = (color) => variants.some((variant) => variant.color === color && variant.size === selectedSize && variant.stock > 0);

  const handleSizeSelect = (size) => {
    if (!hasVariants) { setSelectedSize(size); return; }
    const exact = variants.find((variant) => variant.size === size && variant.color === selectedColor && variant.stock > 0);
    const available = exact || variants.find((variant) => variant.size === size && variant.stock > 0);
    if (!available) return;
    setSelectedSize(available.size || size);
    setSelectedColor(available.color || "");
  };
  const handleColorSelect = (color) => {
    if (!hasVariants) { setSelectedColor(color); return; }
    const exact = variants.find((variant) => variant.color === color && variant.size === selectedSize && variant.stock > 0);
    const available = exact || variants.find((variant) => variant.color === color && variant.stock > 0);
    if (!available) return;
    setSelectedColor(available.color || color);
    setSelectedSize(available.size || "");
  };

  const handleAddToCart = () => {
    if (outOfStock) return toast.error(hasVariants ? "این ترکیب سایز و رنگ موجود نیست" : "این محصول در حال حاضر موجود نیست");
    addToCart(product, { size: selectedSize, color: selectedColor });
  };

  const handleToggleWishlist = () => {
    if (!product) return;
    toggleSaved({ ...product, image: product.image || galleryImages[0] || "" });
  };

  const showPreviousImage = () => {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((index) => (index - 1 + galleryImages.length) % galleryImages.length);
  };

  const showNextImage = () => {
    if (galleryImages.length < 2) return;
    setActiveImageIndex((index) => (index + 1) % galleryImages.length);
  };

  if (loading) return <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-[var(--ui-canvas)] px-4 text-[var(--ui-text)]"><div className="flex items-center gap-3 text-sm text-[var(--ui-muted)]" role="status"><LoaderCircle className="animate-spin" size={20} aria-hidden="true" />در حال بارگذاری جزئیات محصول…</div></main>;
  if (error || !product) return <main dir="rtl" className="min-h-[60vh] bg-[var(--ui-canvas)] px-4 py-16 text-[var(--ui-text)] sm:px-6"><div className="mx-auto max-w-3xl rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-6 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]">محصول در دسترس نیست</p><h1 className="mt-3 font-serif text-3xl">محصول موردنظر پیدا نشد.</h1><p className="mt-3 text-sm leading-6 text-[var(--ui-muted)]">{error || "ممکن است این محصول حذف شده باشد."}</p><Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ui-strong-surface)] px-5 py-3 text-sm font-semibold text-[var(--ui-inverse-text)] transition hover:bg-[var(--ui-strong-hover)]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به مجموعه</Link></div></main>;

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--ui-canvas)] px-3 py-6 text-[var(--ui-text)] sm:px-6 sm:py-10 lg:px-8">
      <PageMeta title={product?.name || "محصول"} description={product?.description || "جزئیات، قیمت و مشخصات محصول در تیک بوتیک."} image={product?.image} path={window.location.pathname} type="product" product={product || undefined} />
      <div className="mx-auto max-w-[1600px]">
        <Link to={product.category ? "/category/" + encodeURIComponent(product.category) : "/"} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]"><ArrowRight size={16} aria-hidden="true" />بازگشت به {categoryLabels[product.category] || product.category || "مجموعه"}</Link>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-8">
          <section aria-label="تصاویر محصول" className="min-w-0">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-surface-raised)]">
              {galleryImages.length ? (
                <img src={galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)]} alt={product.name} fetchPriority="high" className="aspect-[4/5] max-h-[850px] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]" />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center px-6 text-center text-sm text-[var(--ui-muted)]">تصویر محصول به‌زودی اضافه می‌شود</div>
              )}
              {galleryImages.length > 1 && (
                <>
                  <button type="button" onClick={showPreviousImage} aria-label="نمایش تصویر قبلی" className="absolute end-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[var(--ui-surface)]/95 text-[var(--ui-text)] shadow-sm backdrop-blur-sm transition hover:bg-[var(--ui-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={showNextImage} aria-label="نمایش تصویر بعدی" className="absolute start-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[var(--ui-surface)]/95 text-[var(--ui-text)] shadow-sm backdrop-blur-sm transition hover:bg-[var(--ui-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                </>
              )}
              {galleryImages.length > 1 && (
                <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-[var(--ui-surface)]/90 px-3 py-1.5 text-xs font-medium text-[var(--ui-text-strong)] backdrop-blur-sm">
                  {new Intl.NumberFormat("fa-IR").format(activeImageIndex + 1)} از {new Intl.NumberFormat("fa-IR").format(galleryImages.length)} تصویر
                </span>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="انتخاب تصویر محصول">
                {galleryImages.map((image, index) => (
                  <button key={image} type="button" onClick={() => setActiveImageIndex(index)} aria-label={"نمایش تصویر " + (index + 1)} aria-pressed={activeImageIndex === index} className={"overflow-hidden rounded-xl border-2 bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] " + (activeImageIndex === index ? "border-[var(--ui-accent)]" : "border-transparent hover:border-[var(--ui-border-strong)]")}>
                    <img src={image} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-surface)] px-5 py-6 sm:px-8 sm:py-9 lg:sticky lg:top-24 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ui-accent)]">{categoryLabels[product.category] || product.category || "مجموعه تیک بوتیک"}</p>
            <h1 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
            <div className="my-6 h-px bg-[var(--ui-border)]" />

            {sizes.length > 0 && (
              <section aria-labelledby="size-options-heading" className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="size-options-heading" className="text-sm font-semibold">انتخاب سایز</h2>
                  {product.sizeChart?.length > 0 && (
                    <button type="button" onClick={() => setSizeGuideOpen((open) => !open)} aria-expanded={sizeGuideOpen} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[var(--ui-accent)] transition hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
                      <Ruler size={15} aria-hidden="true" />راهنمای سایز
                    </button>
                  )}
                </div>
                {hasVariants && <p className="mb-2 text-xs leading-5 text-[var(--ui-muted)]">گزینه‌های خط‌چین با انتخاب خودکار رنگ سازگار در دسترس‌اند؛ گزینه‌های ناموجود قابل انتخاب نیستند.</p>}
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const hasAnyStock = hasVariants && hasAnyStockForSize(size);
                    const compatible = !hasVariants || hasStockForSize(size);
                    const unavailable = hasVariants && !hasAnyStock;
                    return (
                      <button key={size} type="button" disabled={unavailable} onClick={() => handleSizeSelect(size)} aria-pressed={selectedSize === size} aria-label={hasAnyStock && !compatible ? "سایز " + size + "؛ رنگ سازگار خودکار انتخاب می‌شود" : "سایز " + size} className={"relative min-h-11 min-w-12 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:border-[var(--ui-border)] disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-disabled-text)] disabled:line-through " + (selectedSize === size ? "border-[var(--ui-strong-surface)] bg-[var(--ui-strong-surface)] text-[var(--ui-inverse-text)]" : compatible ? "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] hover:border-[var(--ui-accent)]" : "border-dashed border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-text-strong)] hover:border-[var(--ui-accent)]")}>
                        {size}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {colors.length > 0 && (
              <section aria-labelledby="color-options-heading" className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="color-options-heading" className="text-sm font-semibold">رنگ</h2>
                  <span className="text-xs text-[var(--ui-muted)]">{selectedColor || "انتخاب نشده"}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => {
                    const hasAnyStock = hasVariants && hasAnyStockForColor(color.name);
                    const compatible = !hasVariants || hasStockForColor(color.name);
                    const unavailable = hasVariants && !hasAnyStock;
                    return (
                      <button key={color.name} type="button" disabled={unavailable} onClick={() => handleColorSelect(color.name)} aria-label={hasAnyStock && !compatible ? "انتخاب رنگ " + color.name + "؛ سایز سازگار خودکار انتخاب می‌شود" : "انتخاب رنگ " + color.name} aria-pressed={selectedColor === color.name} className={"group flex min-h-12 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:opacity-35 " + (selectedColor === color.name ? "border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-text)]" : compatible ? "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:border-[var(--ui-border-strong)]" : "border-dashed border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-text-strong)] hover:border-[var(--ui-accent)]")}>
                        <span className={"relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 " + (unavailable ? "after:absolute after:h-px after:w-7 after:rotate-45 after:bg-[var(--ui-danger)]" : "")} style={{ backgroundColor: color.hex || "#d5d0c5" }}>
                          {selectedColor === color.name && <Check size={14} className={["#ffffff", "#fff", "#f9fafb"].includes(String(color.hex).toLowerCase()) ? "text-[var(--ui-text)]" : "text-[var(--ui-inverse-text)] drop-shadow"} aria-hidden="true" />}
                        </span>
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
                {hasVariants && <p className="mt-2 text-xs leading-5 text-[var(--ui-muted)]">رنگ‌های خط‌چین با انتخاب خودکار سایز سازگار در دسترس‌اند.</p>}
              </section>
            )}

            {product.fit && (product.fit.type || product.fit.description || product.fit.modelHeight || product.fit.modelSize) && (
              <section className="mb-6 rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] p-4" aria-labelledby="fit-heading">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--ui-hover)] text-[var(--ui-accent)]"><Shirt size={19} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 id="fit-heading" className="text-sm font-bold">راهنمای تن‌خور</h2>
                    <p className="mt-1 text-sm font-medium text-[var(--ui-text-strong)]">{fitLabels[product.fit.type] || "تن‌خور استاندارد"}</p>
                    {product.fit.description && <p className="mt-1.5 text-xs leading-6 text-[var(--ui-muted)]">{product.fit.description}</p>}
                    {(product.fit.modelHeight || product.fit.modelSize) && (
                      <p className="mt-2 text-xs leading-5 text-[var(--ui-muted)]">
                        {product.fit.modelHeight && <span>قد مدل: {product.fit.modelHeight}</span>}
                        {product.fit.modelHeight && product.fit.modelSize && <span className="mx-2">•</span>}
                        {product.fit.modelSize && <span>سایز پوشیده‌شده توسط مدل: {product.fit.modelSize}</span>}
                      </p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {sizeGuideOpen && product.sizeChart?.length > 0 && (
              <section id="product-size-guide" className="mb-6 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]" aria-labelledby="size-guide-heading">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
                  <h2 id="size-guide-heading" className="text-sm font-bold">جدول اندازه‌ها (سانتی‌متر)</h2>
                  <button type="button" onClick={() => setSizeGuideOpen(false)} aria-label="بستن راهنمای سایز" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"><X size={16} aria-hidden="true" /></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-right text-xs">
                    <thead className="bg-[var(--ui-canvas)] text-[var(--ui-muted)]"><tr><th scope="col" className="px-3 py-3 font-semibold">سایز</th>{measurementLabels.map(([key, label]) => <th scope="col" key={key} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[var(--ui-border)]">
                      {product.sizeChart.map((row) => (
                        <tr key={row.size} className={row.size === selectedSize ? "bg-[var(--ui-hover)]/70 font-semibold" : ""}>
                          <th scope="row" className="px-3 py-3">{row.size}</th>
                          {measurementLabels.map(([key]) => <td key={key} className="px-3 py-3 tabular-nums">{row[key] == null ? "—" : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(row[key])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-3 text-[11px] leading-5 text-[var(--ui-muted)]">این جدول راهنمای اندازه‌گیری محصول است؛ برای مقایسه دقیق، اندازه‌های درج‌شده و توضیح تن‌خور را در نظر بگیرید.</p>
              </section>
            )}

            <div role="status" aria-live="polite" aria-atomic="true" className="mb-6 rounded-xl border border-[var(--ui-border)] px-4 py-3">
              <p className={"flex items-center gap-2 text-sm font-semibold " + (outOfStock ? "text-[var(--ui-danger)]" : "text-[var(--ui-accent)]")}>
                <span className={"h-2 w-2 rounded-full " + (outOfStock ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-accent)]")} aria-hidden="true" />
                {outOfStock ? (hasVariants ? "این ترکیب سایز و رنگ ناموجود است" : "در حال حاضر ناموجود") : "موجود برای سفارش"}
              </p>
              {hasStockValue && <p className="mt-1.5 text-xs text-[var(--ui-muted)]">موجودی دقیق این ترکیب: {new Intl.NumberFormat("fa-IR").format(selectedStock)} عدد</p>}
              {!hasVariants && !isStockTracked(product) && <p className="mt-1.5 text-xs text-[var(--ui-muted)]">موجودی این محصول هنگام ثبت سفارش بررسی می‌شود.</p>}
            </div>

            <h2 className="text-sm font-semibold">درباره این محصول</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--ui-muted)]">{product.description || "انتخابی کاربردی برای تکمیل مجموعه روزمره شما."}</p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--ui-strong-surface)] px-4 py-3 text-sm font-semibold text-[var(--ui-inverse-text)] transition hover:bg-[var(--ui-strong-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-muted)] sm:flex-[1.2]"><ShoppingCart size={17} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}</button>
              <button type="button" onClick={handleToggleWishlist} aria-pressed={isWishlisted} aria-label={isWishlisted ? "حذف محصول از علاقه‌مندی‌ها" : "افزودن محصول به علاقه‌مندی‌ها"} className={"inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] sm:flex-1 " + (isWishlisted ? "border-[var(--ui-accent)] bg-[var(--ui-hover)] text-[var(--ui-accent)]" : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text)] hover:border-[var(--ui-accent)] hover:bg-[var(--ui-hover)]")}>
                <Heart size={17} fill={isWishlisted ? "currentColor" : "none"} aria-hidden="true" />
                {isWishlisted ? "ذخیره‌شده در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              </button>
            </div>
            <Link to="/" className="mt-4 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-2 py-2 text-xs font-semibold text-[var(--ui-muted)] transition hover:text-[var(--ui-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]">ادامه گشت‌وگذار <ArrowLeft size={14} aria-hidden="true" /></Link>
            <div className="mt-5 grid gap-2 border-t border-[var(--ui-border)] pt-4 text-xs sm:grid-cols-3">
              <Link to="/shipping-policy" className="rounded-xl bg-[var(--ui-canvas)] px-3 py-3 text-center text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]">اطلاعات ارسال</Link>
              <Link to="/returns-policy" className="rounded-xl bg-[var(--ui-canvas)] px-3 py-3 text-center text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]">شرایط بازگشت</Link>
              <Link to="/support" className="rounded-xl bg-[var(--ui-canvas)] px-3 py-3 text-center text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]">پشتیبانی و راهنمایی</Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[var(--ui-muted)]"><Check size={15} className="shrink-0 text-[var(--ui-accent)]" aria-hidden="true" />قیمت‌گذاری شفاف و اطلاعات قابل اتکا.</p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductDetailsPage;
