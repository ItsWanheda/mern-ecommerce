import { useEffect, useMemo, useState } from "react";
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

  const hasStockForSize = (size) => variants.some((variant) =>
    variant.size === size && variant.stock > 0
  );
  const hasStockForColor = (color) => variants.some((variant) =>
    variant.color === color && variant.stock > 0
  );

  const handleSizeSelect = (size) => setSelectedSize(size);
  const handleColorSelect = (color) => setSelectedColor(color);

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

  if (loading) return <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-[#f7f5f0] px-4 text-[#252722]"><div className="flex items-center gap-3 text-sm text-[#62645c]" role="status"><LoaderCircle className="animate-spin" size={20} aria-hidden="true" />در حال بارگذاری جزئیات محصول…</div></main>;
  if (error || !product) return <main dir="rtl" className="min-h-[60vh] bg-[#f7f5f0] px-4 py-16 text-[#252722] sm:px-6"><div className="mx-auto max-w-3xl rounded-2xl border border-[#e4e0d8] bg-[#fffefa] px-6 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">محصول در دسترس نیست</p><h1 className="mt-3 font-serif text-3xl">محصول موردنظر پیدا نشد.</h1><p className="mt-3 text-sm leading-6 text-[#77786f]">{error || "ممکن است این محصول حذف شده باشد."}</p><Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به مجموعه</Link></div></main>;

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f5f0] px-3 py-6 text-[#252722] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[1600px]">
        <Link to={product.category ? "/category/" + encodeURIComponent(product.category) : "/"} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><ArrowRight size={16} aria-hidden="true" />بازگشت به {categoryLabels[product.category] || product.category || "مجموعه"}</Link>

        <div className="mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:gap-8">
          <section aria-label="تصاویر محصول" className="min-w-0">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[#e4e0d8] bg-[#eeece5]">
              {galleryImages.length ? (
                <img src={galleryImages[Math.min(activeImageIndex, galleryImages.length - 1)]} alt={product.name} fetchPriority="high" className="aspect-[4/5] max-h-[850px] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]" />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center px-6 text-center text-sm text-[#77786f]">تصویر محصول به‌زودی اضافه می‌شود</div>
              )}
              {galleryImages.length > 1 && (
                <>
                  <button type="button" onClick={showPreviousImage} aria-label="نمایش تصویر قبلی" className="absolute end-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[#fffefa]/95 text-[#252722] shadow-sm backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={showNextImage} aria-label="نمایش تصویر بعدی" className="absolute start-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-[#fffefa]/95 text-[#252722] shadow-sm backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">
                    <ArrowLeft size={18} aria-hidden="true" />
                  </button>
                </>
              )}
              {galleryImages.length > 1 && (
                <span className="absolute bottom-3 left-3 rounded-full border border-white/70 bg-[#fffefa]/90 px-3 py-1.5 text-xs font-medium text-[#41443b] backdrop-blur-sm">
                  {new Intl.NumberFormat("fa-IR").format(activeImageIndex + 1)} از {new Intl.NumberFormat("fa-IR").format(galleryImages.length)} تصویر
                </span>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5" aria-label="انتخاب تصویر محصول">
                {galleryImages.map((image, index) => (
                  <button key={image} type="button" onClick={() => setActiveImageIndex(index)} aria-label={"نمایش تصویر " + (index + 1)} aria-pressed={activeImageIndex === index} className={"overflow-hidden rounded-xl border-2 bg-[#eeece5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] " + (activeImageIndex === index ? "border-[#68745f]" : "border-transparent hover:border-[#c7c3b9]")}>
                    <img src={image} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-[1.5rem] border border-[#e4e0d8] bg-[#fffefa] px-5 py-6 sm:px-8 sm:py-9 lg:sticky lg:top-24 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">{categoryLabels[product.category] || product.category || "مجموعه تیک بوتیک"}</p>
            <h1 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
            <div className="my-6 h-px bg-[#e4e0d8]" />

            {sizes.length > 0 && (
              <section aria-labelledby="size-options-heading" className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="size-options-heading" className="text-sm font-semibold">انتخاب سایز</h2>
                  {product.sizeChart?.length > 0 && (
                    <button type="button" onClick={() => setSizeGuideOpen((open) => !open)} aria-expanded={sizeGuideOpen} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-[#68745f] transition hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
                      <Ruler size={15} aria-hidden="true" />راهنمای سایز
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const unavailable = hasVariants && !hasStockForSize(size);
                    return (
                      <button key={size} type="button" disabled={unavailable} onClick={() => handleSizeSelect(size)} aria-pressed={selectedSize === size} className={"relative min-h-11 min-w-12 rounded-xl border px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:border-[#eeeae2] disabled:bg-[#f7f5f0] disabled:text-[#b8b6ad] disabled:line-through " + (selectedSize === size ? "border-[#252722] bg-[#252722] text-white" : "border-[#d5d0c5] bg-white text-[#41443b] hover:border-[#68745f]")}>
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
                  <span className="text-xs text-[#77786f]">{selectedColor || "انتخاب نشده"}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => {
                    const unavailable = hasVariants && !hasStockForColor(color.name);
                    return (
                      <button key={color.name} type="button" disabled={unavailable} onClick={() => handleColorSelect(color.name)} aria-label={"انتخاب رنگ " + color.name} aria-pressed={selectedColor === color.name} className={"group flex min-h-12 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:opacity-35 " + (selectedColor === color.name ? "border-[#68745f] bg-[#e9ede4] text-[#252722]" : "border-[#e4e0d8] bg-white text-[#62645c] hover:border-[#a8a597]")}>
                        <span className={"relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 " + (unavailable ? "after:absolute after:h-px after:w-7 after:rotate-45 after:bg-[#8b3d34]" : "")} style={{ backgroundColor: color.hex || "#d5d0c5" }}>
                          {selectedColor === color.name && <Check size={14} className={["#ffffff", "#fff", "#f9fafb"].includes(String(color.hex).toLowerCase()) ? "text-[#252722]" : "text-white drop-shadow"} aria-hidden="true" />}
                        </span>
                        <span>{color.name}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {product.fit && (product.fit.type || product.fit.description || product.fit.modelHeight || product.fit.modelSize) && (
              <section className="mb-6 rounded-2xl border border-[#e4e0d8] bg-[#f7f5f0] p-4" aria-labelledby="fit-heading">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e9ede4] text-[#68745f]"><Shirt size={19} aria-hidden="true" /></span>
                  <div className="min-w-0 flex-1">
                    <h2 id="fit-heading" className="text-sm font-bold">راهنمای تن‌خور</h2>
                    <p className="mt-1 text-sm font-medium text-[#41443b]">{fitLabels[product.fit.type] || "تن‌خور استاندارد"}</p>
                    {product.fit.description && <p className="mt-1.5 text-xs leading-6 text-[#62645c]">{product.fit.description}</p>}
                    {(product.fit.modelHeight || product.fit.modelSize) && (
                      <p className="mt-2 text-xs leading-5 text-[#77786f]">
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
              <section id="product-size-guide" className="mb-6 overflow-hidden rounded-2xl border border-[#d5d0c5] bg-white" aria-labelledby="size-guide-heading">
                <div className="flex items-center justify-between gap-3 border-b border-[#eeeae2] px-4 py-3">
                  <h2 id="size-guide-heading" className="text-sm font-bold">جدول اندازه‌ها (سانتی‌متر)</h2>
                  <button type="button" onClick={() => setSizeGuideOpen(false)} aria-label="بستن راهنمای سایز" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#77786f] transition hover:bg-[#f2f0e9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]"><X size={16} aria-hidden="true" /></button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[440px] text-right text-xs">
                    <thead className="bg-[#f7f5f0] text-[#62645c]"><tr><th scope="col" className="px-3 py-3 font-semibold">سایز</th>{measurementLabels.map(([key, label]) => <th scope="col" key={key} className="px-3 py-3 font-semibold">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-[#eeeae2]">
                      {product.sizeChart.map((row) => (
                        <tr key={row.size} className={row.size === selectedSize ? "bg-[#e9ede4]/70 font-semibold" : ""}>
                          <th scope="row" className="px-3 py-3">{row.size}</th>
                          {measurementLabels.map(([key]) => <td key={key} className="px-3 py-3 tabular-nums">{row[key] == null ? "—" : new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(row[key])}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="px-4 py-3 text-[11px] leading-5 text-[#77786f]">این جدول راهنمای اندازه‌گیری محصول است؛ برای مقایسه دقیق، اندازه‌های درج‌شده و توضیح تن‌خور را در نظر بگیرید.</p>
              </section>
            )}

            <div className="mb-6 rounded-xl border border-[#e4e0d8] px-4 py-3">
              <p className={"flex items-center gap-2 text-sm font-semibold " + (outOfStock ? "text-[#8b3d34]" : "text-[#68745f]")}>
                <span className={"h-2 w-2 rounded-full " + (outOfStock ? "bg-[#8b3d34]" : "bg-[#68745f]")} aria-hidden="true" />
                {outOfStock ? (hasVariants ? "این ترکیب سایز و رنگ ناموجود است" : "در حال حاضر ناموجود") : "موجود برای سفارش"}
              </p>
              {hasStockValue && !outOfStock && <p className="mt-1.5 text-xs text-[#77786f]">موجودی این گزینه: {new Intl.NumberFormat("fa-IR").format(selectedStock)} عدد</p>}
              {!hasVariants && !isStockTracked(product) && <p className="mt-1.5 text-xs text-[#77786f]">موجودی این محصول هنگام ثبت سفارش بررسی می‌شود.</p>}
            </div>

            <h2 className="text-sm font-semibold">درباره این محصول</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#62645c]">{product.description || "انتخابی کاربردی برای تکمیل مجموعه روزمره شما."}</p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
              <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#252722] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:bg-[#d5d0c5] disabled:text-[#77786f] sm:flex-[1.2]"><ShoppingCart size={17} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}</button>
              <button type="button" onClick={handleToggleWishlist} aria-pressed={isWishlisted} aria-label={isWishlisted ? "حذف محصول از علاقه‌مندی‌ها" : "افزودن محصول به علاقه‌مندی‌ها"} className={"inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:flex-1 " + (isWishlisted ? "border-[#68745f] bg-[#e9ede4] text-[#526149]" : "border-[#d5d0c5] bg-white text-[#252722] hover:border-[#68745f] hover:bg-[#f7f8f4]")}>
                <Heart size={17} fill={isWishlisted ? "currentColor" : "none"} aria-hidden="true" />
                {isWishlisted ? "ذخیره‌شده در علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
              </button>
            </div>
            <Link to="/" className="mt-4 inline-flex min-h-9 items-center gap-2 self-start rounded-full px-2 py-2 text-xs font-semibold text-[#62645c] transition hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">ادامه گشت‌وگذار <ArrowLeft size={14} aria-hidden="true" /></Link>
            <div className="mt-5 grid gap-2 border-t border-[#eeeae2] pt-4 text-xs sm:grid-cols-3">
              <Link to="/shipping-policy" className="rounded-xl bg-[#f7f5f0] px-3 py-3 text-center text-[#62645c] transition hover:bg-[#e9ede4] hover:text-[#252722]">اطلاعات ارسال</Link>
              <Link to="/returns-policy" className="rounded-xl bg-[#f7f5f0] px-3 py-3 text-center text-[#62645c] transition hover:bg-[#e9ede4] hover:text-[#252722]">شرایط بازگشت</Link>
              <Link to="/support" className="rounded-xl bg-[#f7f5f0] px-3 py-3 text-center text-[#62645c] transition hover:bg-[#e9ede4] hover:text-[#252722]">پشتیبانی و راهنمایی</Link>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-[#77786f]"><Check size={15} className="shrink-0 text-[#68745f]" aria-hidden="true" />قیمت‌گذاری شفاف و اطلاعات قابل اتکا.</p>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ProductDetailsPage;
