"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../components/PageMeta";
import ProductCard from "../components/ProductCard";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Heart, LoaderCircle, Ruler, ShoppingCart,
  X, Shirt, ZoomIn, RefreshCw, Star, Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import { useUserStore } from "../stores/useUserStore";
import { useCategoryStore } from "../stores/useCategoryStore";
import { getProductAttributeRows } from "../lib/product-attributes";
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

const getInitialProductSelection = (candidate) => {
  const variants = Array.isArray(candidate?.variants) ? candidate.variants : [];
  const firstAvailable = variants.find((variant) => Number(variant?.stock) > 0) || variants[0];
  const sizes = Array.isArray(candidate?.sizes) && candidate.sizes.length
    ? candidate.sizes
    : [...new Set(variants.map((variant) => variant?.size).filter(Boolean))];
  const colors = Array.isArray(candidate?.colors) && candidate.colors.length
    ? candidate.colors
    : [...new Set(variants.map((variant) => variant?.color).filter(Boolean))];
  return {
    size: firstAvailable?.size || sizes[0] || "",
    color: firstAvailable?.color || colors[0]?.name || "",
  };
};

const ProductDetailsPage = ({ productId: routeProductId, initialProduct = null }) => {
  const { productId: matchedProductId } = useParams();
  const productId = routeProductId || matchedProductId || "";
  const initialProductMatches = Boolean(initialProduct?._id && String(initialProduct._id) === String(productId));
  const initialSelection = getInitialProductSelection(initialProductMatches ? initialProduct : null);
  const [product, setProduct] = useState(initialProductMatches ? initialProduct : null);
  const [loading, setLoading] = useState(!initialProductMatches);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [selectedSize, setSelectedSize] = useState(initialSelection.size);
  const [selectedColor, setSelectedColor] = useState(initialSelection.color);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState(() => new Set());
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const imageViewerCloseRef = useRef(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const { addToCart } = useCartStore();
  const { isSaved, toggleSaved } = useWishlistStore();
  const user = useUserStore((state) => state.user);
  const { categories: productCategories, fetchCategories: fetchProductCategories } = useCategoryStore();
  const productCategory = productCategories.find((category) =>
    String(category._id) === String(product?.categoryId || "") ||
    category.slug === product?.category ||
    category.name?.fa === product?.category ||
    category.name?.en === product?.category
  );
  const productCategorySlug = productCategory?.slug || (categoryLabels[product?.category] ? product.category : "");
  const productCategoryName = productCategory?.name?.fa || categoryLabels[product?.category] || product?.category || "مجموعه";
  const productAttributeRows = useMemo(() => getProductAttributeRows(product, productCategories), [product, productCategories]);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ average: 0, count: 0, distribution: {} });
  const [reviewEligibility, setReviewEligibility] = useState({ loading: true, eligible: false, reason: "" });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const isWishlisted = Boolean(product && isSaved(product._id));

  useEffect(() => {
    if (productCategories.length === 0) void fetchProductCategories();
  }, [fetchProductCategories, productCategories.length]);

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      if (initialProductMatches && retryCount === 0) {
        setProduct(initialProduct);
        setError("");
        setLoading(false);
        setFailedImageUrls(new Set());
        setImageViewerOpen(false);
        setRelatedProducts([]);
        const selection = getInitialProductSelection(initialProduct);
        setSelectedSize(selection.size);
        setSelectedColor(selection.color);
        setActiveImageIndex(0);
        setSizeGuideOpen(false);
        return;
      }

      setLoading(true); setError(""); setProduct(null);
      setFailedImageUrls(new Set());
      setImageViewerOpen(false);
      setRelatedProducts([]);
      try {
        const response = await axios.get("/products/" + productId);
        if (active) {
          const nextProduct = response.data;
          setProduct(nextProduct);
          const selection = getInitialProductSelection(nextProduct);
          setSelectedSize(selection.size);
          setSelectedColor(selection.color);
          setActiveImageIndex(0);
          setSizeGuideOpen(false);
        }
      } catch (requestError) {
        if (active) {
          const status = requestError.response?.status;
          if (status === 404 || requestError.response?.data?.message === "Product not found") {
            setError("این محصول وجود ندارد یا دیگر در دسترس نیست.");
          } else if (status === 400 || requestError.response?.data?.message === "Invalid product ID") {
            setError("شناسه محصول معتبر نیست.");
          } else {
            setError("بارگذاری این محصول انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.");
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [productId, retryCount, initialProduct, initialProductMatches]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const candidates = [...(Array.isArray(product.images) ? product.images : []), product.image];
    return [...new Set(candidates.filter((image) => typeof image === "string" && image.trim()))];
  }, [product]);

  const activeGalleryImage = galleryImages[Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1))] || "";
  const markGalleryImageFailed = image => {
    if (!image) return;
    setFailedImageUrls(current => {
      const next = new Set(current);
      next.add(image);
      return next;
    });
  };

  useEffect(() => {
    if (!product?._id || !productCategorySlug) return undefined;
    const controller = new AbortController();
    setRelatedProducts([]);
    axios.get(`/products/category/${encodeURIComponent(productCategorySlug)}?page=1&limit=8`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const candidates = Array.isArray(data.products) ? data.products : [];
        const available = candidates.filter(candidate => {
          if (!candidate?._id || String(candidate._id) === String(product._id)) return false;
          const variants = Array.isArray(candidate.variants) ? candidate.variants : [];
          return variants.length
            ? variants.some(variant => Number(variant.stock) > 0)
            : !isOutOfStock(candidate);
        });
        setRelatedProducts(available.slice(0, 4));
      })
      .catch(error => {
        if (!controller.signal.aborted && error.code !== "ERR_CANCELED") setRelatedProducts([]);
      });
    return () => controller.abort();
  }, [product?._id, productCategorySlug]);

  useEffect(() => {
    let active = true;
    axios.get("/reviews/" + productId).then(({data}) => {
      if (!active) return;
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setReviewSummary(data.summary || {average:0,count:0,distribution:{}});
    }).catch(() => { if(active){setReviews([]);setReviewSummary({average:0,count:0,distribution:{}});} });
    return () => { active = false; };
  }, [productId]);

  useEffect(() => {
    let active = true;
    if (!user?._id) { setReviewEligibility({loading:false,eligible:false,reason:"برای ثبت دیدگاه ابتدا وارد حساب کاربری شوید."}); return () => {active=false;}; }
    setReviewEligibility({loading:true,eligible:false,reason:""});
    axios.get("/reviews/"+productId+"/eligibility").then(({data}) => {
      if(active) setReviewEligibility({loading:false,eligible:Boolean(data.eligible),reason:data.reason||""});
    }).catch(error => { if(active) setReviewEligibility({loading:false,eligible:false,reason:error.response?.data?.message||"امکان بررسی شرایط ثبت دیدگاه وجود ندارد."}); });
    return () => {active=false;};
  }, [productId,user?._id]);

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    if (!user?._id || !reviewEligibility.eligible || reviewSubmitting) return;
    setReviewSubmitting(true);
    try {
      await axios.post("/reviews/"+productId,{rating:reviewRating,comment:reviewComment});
      toast.success("دیدگاه شما ثبت شد و پس از تأیید مدیریت نمایش داده می‌شود.");
      setReviewComment("");
      setReviewEligibility({loading:false,eligible:false,reason:"دیدگاه شما در انتظار تأیید مدیریت است."});
    } catch(error) { toast.error(error.response?.data?.message||"ثبت دیدگاه انجام نشد."); }
    finally { setReviewSubmitting(false); }
  };

  useEffect(() => {
    if (!product?._id) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem("tik-boutique-recently-viewed") || "[]");
      const previous = Array.isArray(stored)
        ? stored.filter(item => item?._id && String(item._id) !== String(product._id))
        : [];
      setRecentlyViewed(previous.slice(0, 4));
      const currentItem = {
        _id: product._id,
        name: product.name,
        description: product.description || "",
        image: product.image || galleryImages[0] || "",
        price: product.price,
        category: product.category,
        stock: product.stock,
        variants: Array.isArray(product.variants) ? product.variants : [],
        sizes: Array.isArray(product.sizes) ? product.sizes : [],
        colors: Array.isArray(product.colors) ? product.colors : [],
      };
      window.localStorage.setItem("tik-boutique-recently-viewed", JSON.stringify([currentItem, ...previous].slice(0, 6)));
    } catch {
      setRecentlyViewed([]);
    }
  }, [product?._id, product?.name, product?.description, product?.image, product?.price, product?.category, product?.stock, product?.variants, product?.sizes, product?.colors, galleryImages]);

  useEffect(() => {
    if (!imageViewerOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    const dialog = document.querySelector("[data-product-image-dialog]");
    document.body.style.overflow = "hidden";
    imageViewerCloseRef.current?.focus();
    const handleViewerKey = event => {
      if (event.key === "Escape") setImageViewerOpen(false);
      if (event.key === "ArrowLeft" && galleryImages.length > 1) {
        event.preventDefault();
        setActiveImageIndex(index => (index + 1) % galleryImages.length);
      }
      if (event.key === "ArrowRight" && galleryImages.length > 1) {
        event.preventDefault();
        setActiveImageIndex(index => (index - 1 + galleryImages.length) % galleryImages.length);
      }
      if (event.key === "Tab") {
        const focusable = Array.from(dialog?.querySelectorAll(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        ) || []).filter(element => element.getAttribute("aria-hidden") !== "true");
        if (!focusable.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleViewerKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleViewerKey);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [imageViewerOpen, galleryImages.length]);

  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const sizes = product?.sizes?.length
    ? product.sizes
    : [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
  const colors = product?.colors?.length
    ? product.colors
    : [...new Set(variants.map((variant) => variant.color).filter(Boolean))].map((name) => ({ name, hex: "var(--ui-border-strong)" }));
  const selectedVariant = hasVariants
    ? variants.find((variant) => (variant.size || "") === selectedSize && (variant.color || "") === selectedColor)
    : null;
  const selectedStock = selectedVariant ? selectedVariant.stock : product?.stock;
  const normalizedSelectedStock = Number(selectedStock);
  const hasStockValue = selectedStock !== null && selectedStock !== undefined && selectedStock !== "" && Number.isFinite(normalizedSelectedStock);
  const outOfStock = hasVariants
    ? !selectedVariant || !hasStockValue || normalizedSelectedStock <= 0
    : isOutOfStock(product);

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

  const handleShareProduct = async () => {
    if (!product || typeof window === "undefined") return;
    const url = new URL(window.location.pathname, window.location.origin).toString();
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: product.name,
          text: product.description || "مشاهده جزئیات محصول در تیک بوتیک",
          url,
        });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success("لینک اختصاصی محصول کپی شد.");
        return;
      }
      toast.error("امکان اشتراک‌گذاری در این مرورگر فراهم نیست: " + url);
    } catch (shareError) {
      if (shareError?.name !== "AbortError") toast.error("اشتراک‌گذاری انجام نشد؛ دوباره تلاش کنید.");
    }
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
  if (error || !product) return <main dir="rtl" className="min-h-[60vh] bg-[var(--ui-canvas)] px-4 py-16 text-[var(--ui-text)] sm:px-6"><PageMeta title="محصول در دسترس نیست" description="ممکن است شناسه محصول نادرست باشد یا محصول دیگر در دسترس نباشد." robots="noindex, nofollow" canonical={false} /><div className="mx-auto max-w-3xl rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-6 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--ui-accent)]">محصول در دسترس نیست</p><h1 className="mt-3 font-serif text-3xl">محصول موردنظر پیدا نشد.</h1><p role="status" className="mt-3 text-sm leading-6 text-[var(--ui-muted)]">{error || "ممکن است این محصول حذف شده باشد."}</p><div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row"><button type="button" onClick={() => setRetryCount(count => count + 1)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--ui-border)] px-5 py-3 text-sm font-semibold text-[var(--ui-text)] transition hover:bg-[var(--ui-surface-raised)]"><RefreshCw size={16} aria-hidden="true" />دوباره تلاش کنید</button><Link to="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ui-strong-surface)] px-5 py-3 text-sm font-semibold text-[var(--ui-inverse-text)] transition hover:bg-[var(--ui-strong-hover)]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به مجموعه</Link></div></div></main>;

  const productPath = typeof window !== "undefined"
    ? window.location.pathname
    : "/product/" + encodeURIComponent(productId);

  return (
    <main dir="rtl" className="min-h-screen bg-[var(--ui-canvas)] px-3 py-6 pb-28 text-[var(--ui-text)] sm:px-6 sm:py-10 sm:pb-28 lg:px-8 lg:pb-10">
      <PageMeta title={product?.name || "محصول"} description={product?.description || "جزئیات، قیمت و مشخصات محصول در تیک بوتیک."} image={product?.image} path={productPath} type="product" product={product || undefined} structuredData={false} breadcrumbs={[{ name: "صفحه اصلی", path: "/" }, ...(productCategorySlug ? [{ name: productCategoryName, path: "/category/" + encodeURIComponent(productCategorySlug) }] : []), { name: product?.name || "محصول", path: productPath }]} />
      <div className="mx-auto max-w-[1600px]">
        <Link to={productCategorySlug ? "/category/" + encodeURIComponent(productCategorySlug) : "/categories"} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 py-2 text-sm text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]"><ArrowRight size={16} aria-hidden="true" />بازگشت به {productCategoryName}</Link>

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
          <section aria-label="تصاویر محصول" className="min-w-0">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-[var(--ui-border)] bg-[var(--ui-surface-raised)]">
              {activeGalleryImage && !failedImageUrls.has(activeGalleryImage) ? (
                <button type="button" onClick={() => setImageViewerOpen(true)} aria-label="نمایش تصویر محصول در اندازه بزرگ" className="group block w-full cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--ui-focus)]">
                  <img src={activeGalleryImage} alt={product.name} fetchPriority="high" onError={() => markGalleryImageFailed(activeGalleryImage)} className="aspect-[4/5] max-h-[850px] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]" />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 px-3 py-2 text-xs font-semibold text-[var(--ui-text)] shadow-sm transition group-hover:bg-[var(--ui-surface)]"><ZoomIn size={15} aria-hidden="true" />بزرگ‌نمایی تصویر</span>
                </button>
              ) : (
                <div role="img" aria-label={"تصویر " + product.name + " در دسترس نیست"} className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-[var(--ui-muted)] sm:aspect-[5/4] lg:aspect-[4/5]">
                  <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--ui-border)] text-2xl">◇</span>
                  <span>تصویر محصول به‌زودی اضافه می‌شود</span>
                </div>
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
                    {failedImageUrls.has(image) ? <span className="flex aspect-[4/5] w-full items-center justify-center px-2 text-[10px] text-[var(--ui-muted)]">تصویر موجود نیست</span> : <img src={image} alt="" loading="lazy" onError={() => markGalleryImageFailed(image)} className="aspect-[4/5] w-full object-cover" />}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={handleShareProduct} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] px-4 py-2.5 text-xs font-semibold text-[var(--ui-text)] transition hover:border-[var(--ui-accent)] hover:bg-[var(--ui-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)]"><Share2 size={17} aria-hidden="true" />اشتراک‌گذاری محصول</button>
              <button type="button" onClick={handleToggleWishlist} aria-pressed={isWishlisted} aria-label={isWishlisted ? "حذف محصول از علاقه‌مندی‌ها" : "افزودن محصول به علاقه‌مندی‌ها"} className={"inline-flex h-11 w-11 items-center justify-center rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] " + (isWishlisted ? "border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]" : "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-muted)] hover:border-[var(--ui-accent)] hover:text-[var(--ui-accent)]")}><Heart size={18} fill={isWishlisted ? "currentColor" : "none"} aria-hidden="true" /></button>
            </div>
          </section>

          <section className="min-w-0 rounded-[1.75rem] bg-[var(--ui-surface)] px-5 py-7 shadow-[0_18px_55px_-42px_var(--ui-shadow-color)] sm:px-8 sm:py-10 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ui-accent)]">{productCategoryName || "مجموعه تیک بوتیک"}</p>
            <h1 className="mt-3 font-serif text-3xl font-medium leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            <p className="mt-5 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
            <div className="my-6 h-px bg-[var(--ui-border)]" />

            {sizes.length > 0 && (
              <section aria-labelledby="size-options-heading" className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 id="size-options-heading" className="text-sm font-semibold">انتخاب سایز</h2>
                  {sizes.length > 0 && (
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
                      <button key={size} type="button" disabled={unavailable} onClick={() => handleSizeSelect(size)} aria-pressed={selectedSize === size} aria-label={hasAnyStock && !compatible ? "سایز " + size + "؛ رنگ سازگار خودکار انتخاب می‌شود" : "سایز " + size} className={"relative min-h-12 min-w-[3.5rem] rounded-2xl border px-5 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:border-[var(--ui-border)] disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-disabled-text)] disabled:line-through " + (selectedSize === size ? "border-[var(--ui-strong-surface)] bg-[var(--ui-strong-surface)] text-[var(--ui-inverse-text)]" : compatible ? "border-[var(--ui-border)] bg-[var(--ui-surface)] text-[var(--ui-text-strong)] hover:border-[var(--ui-accent)]" : "border-dashed border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-text-strong)] hover:border-[var(--ui-accent)]")}>
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
                        <span className={"relative inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 " + (unavailable ? "after:absolute after:h-px after:w-7 after:rotate-45 after:bg-[var(--ui-danger)]" : "")} style={{ backgroundColor: color.hex || "var(--ui-border-strong)" }}>
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

            {sizeGuideOpen && sizes.length > 0 && (
              <section id="product-size-guide" className="mb-6 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)]" aria-labelledby="size-guide-heading">
                <div className="flex items-center justify-between gap-3 border-b border-[var(--ui-border)] px-4 py-3">
                  <h2 id="size-guide-heading" className="text-sm font-bold">جدول اندازه‌ها (سانتی‌متر)</h2>
                  <button type="button" onClick={() => setSizeGuideOpen(false)} aria-label="بستن راهنمای سایز" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--ui-muted)] transition hover:bg-[var(--ui-surface-raised)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]"><X size={16} aria-hidden="true" /></button>
                </div>
                {product.sizeChart?.length > 0 ? (
                  <>
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
                    <p className="px-4 py-3 text-[11px] leading-5 text-[var(--ui-muted)]">اندازه‌ها بر حسب سانتی‌متر هستند. برای مقایسه دقیق، اندازه‌های لباس فعلی خود را با جدول مطابقت دهید.</p>
                  </>
                ) : (
                  <p className="px-4 py-4 text-sm leading-7 text-[var(--ui-muted)]">برای این محصول جدول اندازه‌گیری ثبت نشده است. راهنمای تن‌خور و اندازه سایزی که مدل پوشیده را بررسی کنید یا پیش از خرید از پشتیبانی راهنمایی بگیرید.</p>
                )}
              </section>
            )}

            <div role="status" aria-live="polite" aria-atomic="true" className="mb-7 rounded-2xl bg-[var(--ui-canvas)] px-5 py-4">
              {(sizes.length > 0 || colors.length > 0) && (
                <p className="mb-2 text-xs leading-5 text-[var(--ui-muted)]">
                  انتخاب شما: {sizes.length > 0 ? "سایز " + (selectedSize || "انتخاب‌نشده") : "بدون سایز"} · {colors.length > 0 ? "رنگ " + (selectedColor || "انتخاب‌نشده") : "بدون رنگ"}
                </p>
              )}
              <p className={"flex items-center gap-2 text-sm font-semibold " + (outOfStock ? "text-[var(--ui-danger)]" : "text-[var(--ui-accent)]")}>
                <span className={"h-2 w-2 rounded-full " + (outOfStock ? "bg-[var(--ui-danger)]" : "bg-[var(--ui-accent)]")} aria-hidden="true" />
                {outOfStock ? (hasVariants ? "این ترکیب سایز و رنگ ناموجود است" : "در حال حاضر ناموجود") : "موجود برای سفارش"}
              </p>
              {hasStockValue && <p className="mt-1.5 text-xs text-[var(--ui-muted)]">موجودی دقیق این ترکیب: {new Intl.NumberFormat("fa-IR").format(normalizedSelectedStock)} عدد</p>}
              {!hasVariants && !isStockTracked(product) && <p className="mt-1.5 text-xs text-[var(--ui-muted)]">موجودی این محصول هنگام ثبت سفارش بررسی می‌شود.</p>}
            </div>



            <div className="mt-7 hidden flex-col gap-2.5 sm:flex sm:flex-row">
              <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-5 py-3 text-base font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-muted)] sm:flex-[1.2]"><ShoppingCart size={17} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}</button>
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

        <section className="mt-14 rounded-[1.75rem] bg-[var(--ui-surface)] px-5 py-9 sm:mt-20 sm:px-10 sm:py-14" aria-labelledby="product-description-heading">
          <div className="mx-auto max-w-4xl">
            <p className="text-xs font-semibold text-[var(--ui-accent)]">نگاهی نزدیک‌تر</p>
            <h2 id="product-description-heading" className="mt-3 text-2xl font-semibold leading-relaxed sm:text-3xl">درباره این محصول</h2>
            <p className="mt-6 break-words whitespace-pre-line text-[15px] leading-9 text-[var(--ui-muted)] sm:text-base sm:leading-10">{product.description || "اطلاعات بیشتری برای این محصول ثبت نشده است."}</p>
            {productAttributeRows.length > 0 && (
              <div className="mt-8 border-t border-[var(--ui-border)] pt-6 sm:mt-10 sm:pt-8">
                <h3 className="text-lg font-semibold sm:text-xl">مشخصات محصول</h3>
                <dl className="mt-4 grid grid-cols-1 gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
                  {productAttributeRows.map((attribute) => (
                    <div key={attribute.key} className="grid min-w-0 grid-cols-1 gap-1 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] px-3 py-3 sm:px-4 sm:py-3.5">
                      <dt className="min-w-0 break-words text-xs leading-5 text-[var(--ui-muted)]">{attribute.label}</dt>
                      <dd className="min-w-0 break-words text-sm font-semibold leading-6 text-[var(--ui-text)] sm:text-[15px]">{attribute.value}{attribute.unit && <span className="mr-1 font-normal text-[var(--ui-muted)]">{attribute.unit}</span>}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </section>

        <section className="mt-14 rounded-[1.75rem] bg-[var(--ui-surface)] px-5 py-8 sm:mt-20 sm:px-10 sm:py-12" aria-labelledby="customer-reviews-heading">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[var(--ui-border)] pb-7">
              <div><p className="text-xs font-semibold text-[var(--ui-accent)]">تجربه خریداران</p><h2 id="customer-reviews-heading" className="mt-2 text-2xl font-semibold sm:text-3xl">دیدگاه مشتریان</h2><p className="mt-2 text-sm text-[var(--ui-muted)]">دیدگاه‌ها پس از تأیید مدیریت منتشر می‌شوند.</p></div>
              <div><div className="flex items-center gap-2"><Star size={22} className="fill-current text-[var(--ui-accent)]"/><strong className="text-3xl tabular-nums">{reviewSummary.count?reviewSummary.average.toFixed(1):"—"}</strong><span className="text-sm text-[var(--ui-muted)]">از ۵</span></div><p className="mt-1 text-xs text-[var(--ui-muted)]">{new Intl.NumberFormat("fa-IR").format(reviewSummary.count)} دیدگاه تأییدشده</p></div>
            </div>
            {reviewSummary.count>0&&<div className="mt-6 grid gap-2 sm:max-w-xl">{[5,4,3,2,1].map(star=><div key={star} className="flex items-center gap-3 text-xs"><span className="w-12 text-[var(--ui-muted)]">{star} ستاره</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--ui-canvas)]"><div className="h-full rounded-full bg-[var(--ui-accent)]" style={{width:((reviewSummary.distribution?.[star]||0)/reviewSummary.count*100)+"%"}}/></div><span>{reviewSummary.distribution?.[star]||0}</span></div>)}</div>}
            <div className="mt-8 grid gap-3 sm:grid-cols-2">{reviews.length?reviews.map(review=><article key={review._id} className="rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-canvas)] p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{review.displayName||"خریدار تأییدشده"}</h3><p className="mt-1 text-xs text-[var(--ui-muted)]">خریدار تأییدشده</p></div><div className="flex gap-1">{[1,2,3,4,5].map(n=><Star key={n} size={15} className={n<=review.rating?"fill-current text-[var(--ui-accent)]":"text-[var(--ui-border-strong)]"}/>)}</div></div>{review.comment&&<p className="mt-4 whitespace-pre-line text-sm leading-8 text-[var(--ui-muted)]">{review.comment}</p>}</article>):<p className="py-8 text-center text-sm leading-8 text-[var(--ui-muted)]">هنوز دیدگاهی برای این محصول ثبت نشده است.</p>}</div>
            <div className="mt-8 rounded-2xl bg-[var(--ui-canvas)] p-5 sm:p-7"><h3 className="text-lg font-semibold">تجربه‌تان را به اشتراک بگذارید</h3>
              {reviewEligibility.loading?<p className="mt-3 text-sm text-[var(--ui-muted)]">در حال بررسی شرایط ثبت دیدگاه…</p>:reviewEligibility.eligible?<form onSubmit={handleSubmitReview} className="mt-5 space-y-5"><fieldset><legend className="mb-3 text-sm font-medium">امتیاز شما</legend><div className="flex gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" onClick={()=>setReviewRating(n)} aria-label={n+" ستاره"} aria-pressed={reviewRating===n} className="rounded-lg p-1"><Star size={27} className={n<=reviewRating?"fill-current text-[var(--ui-accent)]":"text-[var(--ui-border-strong)]"}/></button>)}</div></fieldset><label htmlFor="product-review-comment" className="block text-sm font-medium">نظر شما (اختیاری)<textarea id="product-review-comment" value={reviewComment} onChange={e=>setReviewComment(e.target.value.slice(0,1500))} rows={5} className="mt-2 w-full rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-4 text-sm leading-8 outline-none focus:border-[var(--ui-focus)]" placeholder="از تجربه خرید و کیفیت محصول بنویسید…"/></label><button disabled={reviewSubmitting} className="min-h-11 rounded-full bg-[var(--ui-strong-surface)] px-6 py-3 text-sm font-semibold text-[var(--ui-inverse-text)] disabled:opacity-50">{reviewSubmitting?"در حال ثبت…":"ارسال برای بررسی"}</button></form>:<p className="mt-3 text-sm leading-8 text-[var(--ui-muted)]">{reviewEligibility.reason||"برای ثبت دیدگاه باید سفارش پرداخت‌شده این محصول به شما تحویل شده باشد."}</p>}
            </div>
          </div>
        </section>

        {(relatedProducts.length > 0 || recentlyViewed.length > 0) && (
          <section className="mt-10 border-t border-[var(--ui-border)] pt-8 sm:mt-14 sm:pt-10" aria-label="پیشنهادهای بیشتر">
            {relatedProducts.length > 0 && (
              <div className="mb-10">
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-xs font-semibold text-[var(--ui-accent)]">انتخاب‌های مشابه</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">محصولات مشابه</h2></div>
                  {productCategorySlug && <Link to={"/category/" + encodeURIComponent(productCategorySlug)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-[var(--ui-muted)] transition hover:bg-[var(--ui-hover)] hover:text-[var(--ui-text)]">مشاهده دسته‌بندی <ArrowLeft size={14} aria-hidden="true" /></Link>}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {relatedProducts.map(item => <ProductCard key={item._id} product={item} />)}
                </div>
              </div>
            )}
            {recentlyViewed.filter(item => String(item._id) !== String(product._id) && !relatedProducts.some(related => String(related._id) === String(item._id)) && (Array.isArray(item.variants) && item.variants.length ? item.variants.some(variant => Number(variant.stock) > 0) : !isOutOfStock(item))).length > 0 && (
              <div>
                <h2 className="mb-5 text-xl font-bold sm:text-2xl">بازدیدهای اخیر شما</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {recentlyViewed.filter(item => String(item._id) !== String(product._id) && !relatedProducts.some(related => String(related._id) === String(item._id)) && (Array.isArray(item.variants) && item.variants.length ? item.variants.some(variant => Number(variant.stock) > 0) : !isOutOfStock(item))).map(item => <ProductCard key={item._id} product={item} />)}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--ui-border)] bg-[var(--ui-surface)]/96 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-16px_40px_-24px_var(--ui-shadow-color)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-[var(--ui-muted)]">{product.name}</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums">{formatPrice(product.price)}</p>
          </div>
          <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-14 min-w-[58%] shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--ui-accent)] px-5 py-3 text-base font-bold text-[var(--ui-button-text)] shadow-sm transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-muted)]">
            <ShoppingCart size={16} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}
          </button>
        </div>
      </div>

      {imageViewerOpen && activeGalleryImage && !failedImageUrls.has(activeGalleryImage) && (
        <div data-product-image-dialog role="dialog" aria-modal="true" aria-label={"نمایش بزرگ تصویر " + product.name} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setImageViewerOpen(false); }}>
          <button ref={imageViewerCloseRef} type="button" onClick={() => setImageViewerOpen(false)} aria-label="بستن تصویر بزرگ" className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-white transition hover:bg-surface/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white sm:right-5 sm:top-5"><X size={21} aria-hidden="true" /></button>
          {galleryImages.length > 1 && <button type="button" onClick={showPreviousImage} aria-label="تصویر قبلی" className="absolute right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-white hover:bg-surface/25 sm:right-6"><ArrowRight size={20} aria-hidden="true" /></button>}
          <img src={activeGalleryImage} alt={product.name} onError={() => markGalleryImageFailed(activeGalleryImage)} className="max-h-[88dvh] max-w-[94vw] touch-pinch-zoom object-contain" />
          {galleryImages.length > 1 && <button type="button" onClick={showNextImage} aria-label="تصویر بعدی" className="absolute left-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-surface/15 text-white hover:bg-surface/25 sm:left-6"><ArrowLeft size={20} aria-hidden="true" /></button>}
        </div>
      )}
    </main>
  );
};

export default ProductDetailsPage;
