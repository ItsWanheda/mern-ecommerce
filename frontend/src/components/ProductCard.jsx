import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowUpLeft, Heart, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCartStore } from "../stores/useCartStore";
import { useWishlistStore } from "../stores/useWishlistStore";
import { formatPrice, isOutOfStock, isStockTracked } from "../lib/commerce";

const categoryLabels = {
  jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک",
  jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف",
};

const getProductColors = (product) => {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const configuredColors = Array.isArray(product.colors) ? product.colors : [];
  const candidates = configuredColors.length
    ? configuredColors
    : [...new Map(variants.filter((variant) => variant.color).map((variant) => [
        variant.color,
        { name: variant.color, hex: "var(--ui-border-strong)" },
      ])).values()];

  const seen = new Set();
  return candidates.filter((color) => {
    if (!color?.name || seen.has(color.name)) return false;
    if (variants.length && !variants.some((variant) => variant.color === color.name && Number(variant.stock) > 0)) return false;
    seen.add(color.name);
    return true;
  });
};

const ProductCard = ({ product }) => {
  const { addToCart } = useCartStore();
  const { isSaved, toggleSaved } = useWishlistStore();
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [product.image]);
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const outOfStock = hasVariants
    ? product.variants.every((variant) => Number(variant.stock) <= 0)
    : isOutOfStock(product);
  const colors = getProductColors(product);
  const sizes = Array.isArray(product.sizes) && product.sizes.length
    ? product.sizes
    : [...new Set((Array.isArray(product.variants) ? product.variants : []).map((variant) => variant.size).filter(Boolean))];
  const saved = isSaved(product._id);
  const variantStock = hasVariants
    ? product.variants.reduce((total, variant) => total + Math.max(0, Number(variant.stock) || 0), 0)
    : null;
  const lowStock = hasVariants
    ? variantStock > 0 && variantStock <= 3
    : isStockTracked(product) && product.stock > 0 && product.stock <= 3;

  const handleAddToCart = () => {
    if (hasVariants) {
      navigate("/product/" + product._id);
      return;
    }
    if (outOfStock) return toast.error("این محصول در حال حاضر موجود نیست");
    addToCart(product);
  };

  return (
    <article dir="rtl" className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-[0_18px_45px_-24px_rgba(37,39,34,0.28)]">
      <div className="relative">
        <Link to={`/product/${product._id}`} aria-label={`مشاهده جزئیات ${product.name}`} className="relative block overflow-hidden bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand">
          <div className="aspect-[4/5] overflow-hidden">
            {product.image && !imageFailed ? (
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className={`h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none ${outOfStock ? "grayscale-[0.3]" : ""}`}
              />
            ) : (
              <div role="img" aria-label={"تصویر " + product.name + " در دسترس نیست"} className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-soft">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-lg">◇</span>
                <span>تصویر محصول به‌زودی اضافه می‌شود</span>
              </div>
            )}
          </div>
        </Link>

        <span className="pointer-events-none absolute left-3 top-3 max-w-[55%] truncate whitespace-nowrap rounded-full border border-white/70 bg-surface/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-muted backdrop-blur-sm">{categoryLabels[product.category] || product.category || "مجموعه"}</span>

        <button
          type="button"
          onClick={() => toggleSaved(product)}
          aria-label={saved ? `حذف ${product.name} از علاقه‌مندی‌ها` : `ذخیره ${product.name} در علاقه‌مندی‌ها`}
          aria-pressed={saved}
          className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${saved ? "border-brand bg-brand-soft text-brand-deep" : "border-white/70 bg-surface/95 text-ink-strong hover:border-border-strong hover:bg-surface"}`}
        >
          <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
        </button>

        {outOfStock && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-strong/95 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">ناموجود</span>}
        {lowStock && (
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-white/70 bg-surface/95 px-3 py-1.5 text-[10px] font-semibold text-brand shadow-sm backdrop-blur-sm">موجودی محدود</span>
        )}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-surface/95 text-ink opacity-0 shadow-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"><ArrowUpLeft size={18} aria-hidden="true" /></span>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex-1">
          <Link to={`/product/${product._id}`} className="block min-h-12 rounded-sm text-sm font-medium leading-6 text-ink transition hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:text-base">
            <span className="line-clamp-2">{product.name}</span>
          </Link>

          <div role={colors.length ? "group" : undefined} aria-label={colors.length ? `رنگ‌های موجود برای ${product.name}` : undefined} className="mt-2.5 flex min-h-6 items-center gap-1.5 overflow-hidden">
            {colors.length > 0 ? (
              <>
                {colors.slice(0, 5).map((color) => (
                  <span
                    key={color.name}
                    title={color.name}
                    aria-label={`رنگ ${color.name}`}
                    className="inline-flex h-[17px] w-[17px] shrink-0 rounded-full border border-black/10 ring-1 ring-transparent transition group-hover:ring-border-strong"
                    style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(color.hex || "") ? color.hex : "var(--ui-border-strong)" }}
                  />
                ))}
                {colors.length > 5 && <span className="shrink-0 text-[10px] text-muted-soft">+{new Intl.NumberFormat("fa-IR").format(colors.length - 5)}</span>}
                <span className="mr-1 truncate text-[10px] text-muted-soft">{new Intl.NumberFormat("fa-IR").format(colors.length)} رنگ</span>
              </>
            ) : sizes.length > 0 ? (
              <span className="truncate text-[10px] text-muted-soft">سایزهای موجود: {sizes.slice(0, 3).join("، ")}{sizes.length > 3 ? " +" + new Intl.NumberFormat("fa-IR").format(sizes.length - 3) : ""}</span>
            ) : (
              <span aria-hidden="true" className="block h-4" />
            )}
          </div>

          <p className="mt-3 text-lg font-semibold tabular-nums tracking-tight text-ink">{formatPrice(product.price)}</p>
        </div>

        <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-strong px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-strong-hover sm:px-4 sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:bg-border-strong disabled:text-muted-soft">
          <ShoppingCart size={16} aria-hidden="true" />{outOfStock ? "ناموجود" : hasVariants ? "انتخاب سایز و رنگ" : "افزودن به سبد خرید"}
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
