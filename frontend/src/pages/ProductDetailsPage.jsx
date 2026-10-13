import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShoppingCart } from "lucide-react";
import toast from "react-hot-toast";
import axios from "../lib/axios";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";
import { formatPrice, isOutOfStock, isStockTracked } from "../lib/commerce";

const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };

const ProductDetailsPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { user } = useUserStore();
  const { addToCart } = useCartStore();

  useEffect(() => {
    let active = true;
    const fetchProduct = async () => {
      setLoading(true); setError(""); setProduct(null);
      try {
        const response = await axios.get(`/products/${productId}`);
        if (active) setProduct(response.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "بارگذاری این محصول انجام نشد. لطفاً دوباره تلاش کنید.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProduct();
    return () => { active = false; };
  }, [productId]);

  const handleAddToCart = () => {
    if (isOutOfStock(product)) return toast.error("این محصول در حال حاضر موجود نیست");
    if (!user) { navigate("/login", { state: { from: `/product/${productId}` } }); return; }
    addToCart(product);
  };

  if (loading) return <main dir="rtl" className="flex min-h-[60vh] items-center justify-center bg-[#f7f5f0] px-4 text-[#252722]"><div className="flex items-center gap-3 text-sm text-[#62645c]" role="status"><LoaderCircle className="animate-spin" size={20} aria-hidden="true" />در حال بارگذاری جزئیات محصول…</div></main>;
  if (error || !product) return <main dir="rtl" className="min-h-[60vh] bg-[#f7f5f0] px-4 py-16 text-[#252722] sm:px-6"><div className="mx-auto max-w-3xl rounded-2xl border border-[#e4e0d8] bg-[#fffefa] px-6 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">محصول در دسترس نیست</p><h1 className="mt-3 font-serif text-3xl">محصول موردنظر پیدا نشد.</h1><p className="mt-3 text-sm leading-6 text-[#77786f]">{error || "ممکن است این محصول حذف شده باشد."}</p><Link to="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به مجموعه</Link></div></main>;

  const outOfStock = isOutOfStock(product);
  return <main dir="rtl" className="min-h-screen bg-[#f7f5f0] px-4 py-8 pb-28 text-[#252722] sm:px-6 sm:py-12 lg:px-8 lg:pb-12">
    <div className="mx-auto max-w-7xl">
      <Link to={product.category ? `/category/${encodeURIComponent(product.category)}` : "/"} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-[#62645c] transition hover:bg-[#e9e5dc] hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به {categoryLabels[product.category] || product.category || "مجموعه"}</Link>
      <div className="mt-5 grid overflow-hidden rounded-[2rem] border border-[#e4e0d8] bg-[#fffefa] lg:grid-cols-2">
        <div className="relative min-h-[360px] bg-[#f0eee8] sm:min-h-[520px]">{product.image ? <img src={product.image} alt={product.name} className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex min-h-[360px] h-full items-center justify-center text-sm text-[#77786f]">تصویر محصول به‌زودی اضافه می‌شود</div>}</div>
        <div className="flex items-center px-6 py-10 sm:px-10 lg:px-14 lg:py-16"><div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#68745f]">{categoryLabels[product.category] || product.category || "مجموعه"}</p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">{product.name}</h1>
          <p className="mt-5 text-2xl font-semibold tabular-nums">{formatPrice(product.price)}</p>
          <p className={`mt-3 text-sm ${outOfStock ? "text-red-600" : "text-[#68745f]"}`}>
            {outOfStock ? "در حال حاضر ناموجود" : isStockTracked(product) ? `موجودی انبار: ${new Intl.NumberFormat("fa-IR").format(product.stock)} عدد` : "موجودی در حال به‌روزرسانی است"}
          </p>
          <div className="my-7 h-px bg-[#e4e0d8]" />
          <h2 className="text-sm font-semibold">درباره این محصول</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#62645c]">{product.description || "انتخابی کاربردی برای تکمیل مجموعه روزمره شما."}</p>
          <div className="mt-8 hidden flex-col gap-3 lg:flex lg:flex-row">
            <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#252722] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] disabled:cursor-not-allowed disabled:bg-[#d5d0c5] disabled:text-[#77786f]"><ShoppingCart size={17} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد خرید"}</button>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#d5d0c5] px-6 py-3 text-sm font-semibold text-[#252722] transition hover:border-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">ادامه گشت‌وگذار <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs leading-5 text-[#77786f]"><Check size={15} className="shrink-0 text-[#68745f]" aria-hidden="true" />قیمت‌گذاری شفاف و اطلاعات قابل اتکا.</p>
        </div></div>
      </div>
    </div>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d5d0c5] bg-[#fffefa]/95 px-4 py-3 shadow-[0_-12px_32px_-24px_rgba(37,39,34,0.35)] backdrop-blur-xl lg:hidden">
        <div dir="rtl" className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1"><p className="text-[11px] text-[#55584f]">قیمت محصول</p><p className="truncate text-base font-bold tabular-nums text-[#252722]">{formatPrice(product.price)}</p></div>
          {!user ? <Link to="/login" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b]"><ShoppingCart size={17} aria-hidden="true" />ورود برای خرید</Link> : <button type="button" onClick={handleAddToCart} disabled={outOfStock} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] disabled:cursor-not-allowed disabled:bg-[#d5d0c5] disabled:text-[#707267]"><ShoppingCart size={17} aria-hidden="true" />{outOfStock ? "ناموجود" : "افزودن به سبد"}</button>}
        </div>
      </div>
    </main>;
};
export default ProductDetailsPage;
