import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowUpLeft, Heart, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import { useReviewSummaryStore } from "../stores/useReviewSummaryStore.js";
import { formatPrice, isOutOfStock, isStockTracked } from "../lib/commerce";
import { requiresCatalogMigration } from "../lib/catalog-migration.js";

const persianNumber = (value) => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();
  const { isSaved, toggleSaved } = useWishlistStore();
  const reviewSummary = useReviewSummaryStore((state) => state.summaries[String(product?._id || "")]);
  const requestReviewSummary = useReviewSummaryStore((state) => state.requestSummary);
  const [imageFailed, setImageFailed] = useState(false);
  const productImage = product.image || product.images?.[0] || "";
  useEffect(() => setImageFailed(false), [productImage]);
  useEffect(() => {
    if (product?._id) requestReviewSummary(product._id);
  }, [product?._id, requestReviewSummary]);

  const requiresCatalogUpdate = requiresCatalogMigration(product);
  const outOfStock = requiresCatalogUpdate || isOutOfStock(product);
  const saved = isSaved(product._id);
  const lowStock = !requiresCatalogUpdate && isStockTracked(product) && product.stock > 0 && product.stock <= 3;
  const rating = Number(reviewSummary?.average || 0);
  const reviewCount = Number(reviewSummary?.count || 0);

  const handleAddToCart = () => {
    if (requiresCatalogUpdate) return toast.error("این کالا هنوز به ساختار مشخصات فنی و موجودی جدید منتقل نشده است.");
    if (outOfStock) return toast.error("این محصول در حال حاضر موجود نیست");
    addToCart(product);
  };

  return (
    <article dir="rtl" className="product-card group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--ui-border-strong)] hover:shadow-[0_16px_36px_-26px_var(--ui-shadow-color)]">
      <div className="relative">
        <Link
          to={`/product/${product._id}`}
          aria-label={`مشاهده جزئیات ${product.name}`}
          className="product-card__image-link relative block overflow-hidden bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--ui-focus)]"
        >
          <div className="product-card__image-frame aspect-square w-full overflow-hidden bg-white">
            {productImage && !imageFailed ? (
              <img
                src={productImage}
                alt={product.name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className={`h-full w-full bg-white object-contain object-center p-3 transition-transform duration-300 ease-out group-hover:scale-[1.035] sm:p-4 motion-reduce:transition-none ${outOfStock ? "grayscale-[0.25]" : ""}`}
              />
            ) : (
              <div role="img" aria-label={"تصویر " + product.name + " در دسترس نیست"} className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs leading-5 text-[var(--ui-muted)]">
                <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--ui-border-strong)] text-xl">◇</span>
                <span>تصویر محصول موجود نیست</span>
              </div>
            )}
          </div>
        </Link>

        <span className="pointer-events-none absolute start-3 top-3 max-w-[62%] truncate whitespace-nowrap rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 px-2.5 py-1 text-[10px] font-semibold text-[var(--ui-muted)] shadow-sm backdrop-blur-sm">
          <bdi dir="auto">{product.categoryName?.fa || product.categoryName || String(product.category || "سخت‌افزار").replace(/-/g, " ")}</bdi>
        </span>

        <button
          type="button"
          onClick={() => toggleSaved(product)}
          aria-label={saved ? `حذف ${product.name} از علاقه‌مندی‌ها` : `ذخیره ${product.name} در علاقه‌مندی‌ها`}
          aria-pressed={saved}
          className={`absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] ${saved ? "border-[var(--ui-accent)] bg-[var(--ui-accent-soft)] text-[var(--ui-accent)]" : "border-[var(--ui-border)] bg-[var(--ui-surface)]/95 text-[var(--ui-text-strong)] hover:border-[var(--ui-border-strong)] hover:bg-[var(--ui-surface)]"}`}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>

        {requiresCatalogUpdate ? (
          <span className="pointer-events-none absolute bottom-3 start-3 rounded-full border border-[var(--ui-warning-border)] bg-[var(--ui-warning-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--ui-warning)] shadow-sm">نیازمند به‌روزرسانی</span>
        ) : outOfStock ? (
          <span className="pointer-events-none absolute bottom-3 start-3 rounded-full bg-[var(--ui-strong-surface)]/95 px-2.5 py-1 text-[10px] font-semibold text-[var(--ui-inverse-text)] shadow-sm">ناموجود</span>
        ) : lowStock ? (
          <span className="pointer-events-none absolute bottom-3 start-3 rounded-full border border-[var(--ui-border)] bg-[var(--ui-surface)]/95 px-2.5 py-1 text-[10px] font-semibold text-[var(--ui-accent)] shadow-sm">موجودی محدود</span>
        ) : null}

        <span className="pointer-events-none absolute bottom-3 end-3 inline-flex h-8 w-8 translate-y-1 items-center justify-center rounded-full bg-[var(--ui-surface)]/95 text-[var(--ui-text)] opacity-0 shadow-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <ArrowUpLeft size={16} aria-hidden="true" />
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3 sm:p-3.5">
        <Link
          to={`/product/${product._id}`}
          className="product-card__title block min-h-[2.8rem] text-right text-[13px] font-semibold leading-6 text-[var(--ui-text)] transition hover:text-[var(--ui-accent)] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] sm:min-h-[3rem] sm:text-sm"
        >
          <bdi dir="auto" className="line-clamp-2">{product.name}</bdi>
        </Link>

        <div className="mt-2 flex min-h-5 items-center justify-between gap-2">
          {reviewCount > 0 ? (
            <span className="inline-flex min-w-0 items-center gap-1 text-[10px] text-[var(--ui-muted)] sm:text-[11px]" aria-label={`امتیاز ${rating.toFixed(1)} از ۵ بر اساس ${reviewCount} دیدگاه`}>
              <Star size={13} className="shrink-0 fill-current text-[#c29b4d]" aria-hidden="true" />
              <strong className="font-semibold tabular-nums text-[var(--ui-text-strong)]">{rating.toFixed(1)}</strong>
              <span className="truncate">({persianNumber(reviewCount)})</span>
            </span>
          ) : (
            <span className="text-[10px] text-[var(--ui-muted)]">هنوز امتیازی ثبت نشده</span>
          )}
          {Number(product.soldQuantity) > 0 && (
            <span className="truncate text-[10px] text-[var(--ui-muted)]">{persianNumber(product.soldQuantity)} فروش</span>
          )}
        </div>

        <div className="mt-auto pt-3">
          <p className="text-base font-bold tabular-nums tracking-tight text-[var(--ui-text)] sm:text-lg">{formatPrice(product.price)}</p>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={outOfStock}
            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[var(--ui-accent)] px-2.5 py-2 text-[11px] font-bold text-[var(--ui-button-text)] transition hover:bg-[var(--ui-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-focus)] disabled:cursor-not-allowed disabled:bg-[var(--ui-disabled-bg)] disabled:text-[var(--ui-muted)] sm:min-h-11 sm:px-3 sm:text-xs"
          >
            <ShoppingCart size={15} aria-hidden="true" />
            {requiresCatalogUpdate ? "نیازمند به‌روزرسانی" : outOfStock ? "ناموجود" : "افزودن به سبد خرید"}
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
