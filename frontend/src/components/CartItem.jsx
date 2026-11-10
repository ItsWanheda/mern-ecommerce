import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCartStore } from "../stores/useCartStore";
import { formatPrice } from "../lib/commerce";
import { requiresCatalogMigration } from "../lib/catalog-migration.js";

const CartItem = ({ item }) => {
  const { removeFromCart, updateQuantity } = useCartStore();
  const requiresCatalogUpdate = requiresCatalogMigration(item);
  const selectedVariant = (item.variants || []).find((variant) =>
    (variant.size || "") === (item.selectedSize || "") &&
    (variant.color || "") === (item.selectedColor || "")
  );
  const trackedStock = selectedVariant ? selectedVariant.stock : item.stock;
  const hasTrackedStock = typeof trackedStock === "number" && Number.isFinite(trackedStock);
  const maxReached = hasTrackedStock && item.quantity >= trackedStock;
  const image = item.image || item.images?.[0] || "";

  return (
    <article dir="rtl" className="cart-item min-w-0 overflow-hidden rounded-2xl border border-[var(--ui-border)] bg-[var(--ui-surface)] p-3 shadow-[0_12px_32px_-28px_var(--ui-shadow-color)] sm:p-4">
      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <Link to={`/product/${item._id}`} aria-label={"مشاهده " + item.name} className="inline-flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--ui-border)] bg-white sm:h-28 sm:w-28">
          {image ? <img src={image} alt={item.name} loading="lazy" className="h-full w-full object-contain p-2" /> : <span className="text-xs text-[var(--ui-muted)]">بدون تصویر</span>}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <Link to={`/product/${item._id}`} className="block text-sm font-bold leading-6 text-[var(--ui-text)] transition hover:text-[var(--ui-accent)]">
                <bdi dir="auto" className="line-clamp-2">{item.name}</bdi>
              </Link>
              {item.guestOnly && !requiresCatalogUpdate && <span className="mt-1 inline-flex rounded-full bg-[var(--ui-warning-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--ui-warning)]">نیازمند بررسی موجودی</span>}
            </div>
            <button type="button" onClick={() => removeFromCart(item)} aria-label={"حذف " + item.name + " از سبد خرید"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--ui-muted)] transition hover:bg-[var(--ui-danger-bg)] hover:text-[var(--ui-danger)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ui-focus)]">
              <Trash2 size={17} aria-hidden="true" />
            </button>
          </div>

          {requiresCatalogUpdate && (
            <p role="alert" className="mt-2 rounded-xl border border-[var(--ui-warning-border)] bg-[var(--ui-warning-bg)] px-3 py-2 text-[10px] leading-5 text-[var(--ui-warning)]">
              این کالا هنوز به ساختار مشخصات فنی جدید منتقل نشده است؛ تغییر تعداد و پرداخت غیرفعال است. می‌توانید آن را از سبد حذف کنید.
            </p>
          )}
          {item.guestOnly && !requiresCatalogUpdate && (
            <p role="status" className="mt-2 text-[10px] leading-5 text-[var(--ui-muted)]">موجودی این گزینه پس از ورود به حساب دوباره بررسی می‌شود.</p>
          )}
          {item.description && <p dir="auto" className="mt-1 hidden line-clamp-2 text-xs leading-5 text-[var(--ui-muted)] sm:block">{item.description}</p>}
          {(item.selectedSize || item.selectedColor) && !requiresCatalogUpdate && (
            <p className="mt-1 text-[10px] text-[var(--ui-muted)]">گزینه: <bdi dir="auto">{[item.selectedSize, item.selectedColor].filter(Boolean).join(" · ")}</bdi></p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--ui-border)] bg-[var(--ui-surface-raised)] p-1">
              <button type="button" disabled={requiresCatalogUpdate || item.quantity <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-surface)] text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-35" aria-label="کاهش تعداد" onClick={() => updateQuantity(item, item.quantity - 1)}>
                <Minus size={14} aria-hidden="true" />
              </button>
              <span className="min-w-7 text-center text-xs font-bold tabular-nums">{new Intl.NumberFormat("fa-IR").format(item.quantity)}</span>
              <button type="button" disabled={maxReached || requiresCatalogUpdate} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--ui-surface)] text-[var(--ui-text-strong)] transition hover:bg-[var(--ui-hover)] disabled:cursor-not-allowed disabled:opacity-35" aria-label="افزایش تعداد" onClick={() => updateQuantity(item, item.quantity + 1)}>
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-extrabold tabular-nums text-[var(--ui-text)]">{formatPrice(Number(item.price) * Number(item.quantity))}</p>
              <p className="mt-0.5 text-[10px] text-[var(--ui-muted)]">{formatPrice(item.price)} برای هر عدد</p>
              {hasTrackedStock && !requiresCatalogUpdate && <p className="mt-0.5 text-[10px] text-[var(--ui-muted)]">موجودی: {new Intl.NumberFormat("fa-IR").format(trackedStock)}</p>}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default CartItem;
