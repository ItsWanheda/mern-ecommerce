import toast from "react-hot-toast";
import { ArrowUpRight, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };

const formatPrice = (price) => Number(price).toLocaleString("en-US", { style: "currency", currency: "USD" });

const ProductCard = ({ product }) => {
  const { user } = useUserStore();
  const { addToCart } = useCartStore();
  const handleAddToCart = () => {
    if (!user) return toast.error("برای افزودن کالا به سبد خرید، ابتدا وارد حساب کاربری شوید.", { id: "login" });
    addToCart(product);
  };

  return (
    <article className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-[#e4e0d8] bg-white transition duration-300 hover:-translate-y-1 hover:border-[#d5d0c5] hover:shadow-[0_18px_45px_-24px_rgba(37,39,34,0.28)]">
      <Link to={`/product/${product._id}`} aria-label={`مشاهده جزئیات ${product.name}`} className="relative block overflow-hidden bg-[#f0eee8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">
        <div className="aspect-[4/5] overflow-hidden">
          {product.image ? <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none" /> : <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#77786f]">تصویر محصول به‌زودی اضافه می‌شود</div>}
        </div>
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-[#fffefa]/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#62645c] backdrop-blur-sm">{categoryLabels[product.category] || product.category || "مجموعه"}</span>
        <span className="absolute bottom-3 right-3 inline-flex h-10 w-10 translate-y-1 items-center justify-center rounded-full bg-[#fffefa]/95 text-[#252722] opacity-0 shadow-sm transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"><ArrowUpRight size={18} aria-hidden="true" /></span>
      </Link>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex-1">
          <Link to={`/product/${product._id}`} className="inline-block rounded-sm text-sm font-medium leading-6 text-[#252722] transition hover:text-[#68745f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:text-base"><span className="line-clamp-2">{product.name}</span></Link>
          <p className="mt-2 text-lg font-semibold tabular-nums tracking-tight text-[#252722]">{formatPrice(product.price)}</p>
        </div>
        <button type="button" onClick={handleAddToCart} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#252722] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><ShoppingCart size={16} aria-hidden="true" />افزودن به سبد خرید</button>
      </div>
    </article>
  );
};
export default ProductCard;
