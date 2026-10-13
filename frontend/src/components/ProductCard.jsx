import toast from "react-hot-toast";
import { ArrowUpLeft, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { formatPrice, isOutOfStock, isStockTracked } from "../lib/commerce";

const categoryLabels = {
  jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک",
  jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف",
};

const ProductCard = ({ product }) => {
  const { user } = useUserStore();
  const { addToCart } = useCartStore();
  const outOfStock = isOutOfStock(product);

  const handleAddToCart = () => {
    if (outOfStock) return toast.error("این محصول در حال حاضر موجود نیست");
    if (!user) return toast.error("برای افزودن کالا به سبد خرید، ابتدا وارد حساب کاربری شوید.", { id: "login" });
    addToCart(product);
  };

  return (
    <article dir="rtl" className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#e4e0d8] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#d5d0c5] hover:shadow-[0_18px_45px_-24px_rgba(37,39,34,0.28)]">
      <Link to={`/product/${product._id}`} aria-label={`مشاهده جزئیات ${product.name}`} className="relative block overflow-hidden bg-[#f0eee8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#68745f]">
        <div className="aspect-[4/5] overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} loading="lazy" decoding="async" className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#77786f]">تصویر محصول به‌زودی اضافه می‌شود</div>
          )}
        </div>
        <span className="absolute left-3 top-3 max-w-[55%] truncate whitespace-nowrap rounded-full border border-white/70 bg-[#fffefa]/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#62645c] backdrop-blur-sm">{categoryLabels[product.category] || product.category || "مجموعه"}</span>
        {outOfStock && <span className="absolute left-3 top-12 rounded-full bg-[#252722]/90 px-3 py-1.5 text-[10px] font-semibold text-white">ناموجود</span>}
        {isStockTracked(product) && product.stock > 0 && product.stock <= 3 && (
          <span className="absolute right-3 top-3 rounded-full border border-white/70 bg-[#fffefa]/90 px-3 py-1.5 text-[10px] font-semibold text-[#68745f] backdrop-blur-sm">موجودی محدود</span>
        )}
        <span className="absolute bottom-3 right-3 inline-flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-[#fffefa]/95 text-[#252722] opacity-0 shadow-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"><ArrowUpLeft size={18} aria-hidden="true" /></span>
      </Link>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="flex-1">
          <Link to={`/product/${product._id}`} className="block min-h-12 rounded-sm text-sm font-medium leading-6 text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:text-base">
            <span className="line-clamp-2">{product.name}</span>
          </Link>
          <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#252722]">{formatPrice(product.price)}</p>
        </div>
        <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#252722] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#41443b] sm:px-4 sm:text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:bg-[#d5d0c5] disabled:text-[#77786f]">
          <ShoppingCart size={16} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}
        </button>
      </div>
    </article>
  );
};
export default ProductCard;
