import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Search, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import axios from "../lib/axios";
import ProductCard from "../components/ProductCard";

const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };
const persianNumber = (value) => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);

const CategoryPage = () => {
  const { category = "" } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = categoryLabels[category] || category;

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setProducts([]);
    axios.get(`/products/category/${encodeURIComponent(category)}`)
      .then(({ data }) => { if (active) setProducts(Array.isArray(data.products) ? data.products : []); })
      .catch((requestError) => {
        if (!active) return;
        setProducts([]);
        setError(requestError.response?.data?.message || "دریافت محصولات این دسته‌بندی ناموفق بود.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category]);

  return (
    <main dir="rtl" className="min-h-[70vh] bg-[#f7f5f0] px-3 py-8 text-[#252722] sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="مسیر صفحه" className="mb-6 flex items-center gap-2 text-xs text-[#55584f] sm:text-sm">
          <Link to="/" className="rounded-sm transition hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">صفحه اصلی</Link><span aria-hidden="true">/</span>
          <Link to="/shop" className="rounded-sm transition hover:text-[#252722] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68745f]">فروشگاه</Link><span aria-hidden="true">/</span><span className="font-medium text-[#252722]" aria-current="page">{title}</span>
        </nav>
        <header className="mb-6 flex flex-col gap-4 border-b border-[#e4e0d8] pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-xs font-semibold tracking-[0.16em] text-[#68745f]">مجموعه فروشگاه</p><h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{title}</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[#55584f]">محصولات این دسته‌بندی را مرور کنید و برای انتخاب دقیق‌تر از فیلترها و مرتب‌سازی فروشگاه استفاده کنید.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <span aria-live="polite" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#e4e0d8] bg-[#fffefa] px-4 py-2 text-sm text-[#55584f]">{loading ? <LoaderCircle size={16} className="animate-spin text-[#68745f]" aria-hidden="true" /> : <ShoppingBag size={16} className="text-[#68745f]" aria-hidden="true" />}{loading ? "در حال بارگذاری…" : `${persianNumber(products.length)} محصول`}</span>
            <Link to={`/shop?category=${encodeURIComponent(category)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252722] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]">فیلتر و مرتب‌سازی <ArrowLeft size={15} aria-hidden="true" /></Link>
          </div>
        </header>
        {error && <section role="alert" className="rounded-2xl border border-[#e6c7c2] bg-[#fff7f5] px-5 py-8 text-center"><h2 className="font-semibold text-[#7f332b]">بارگذاری محصولات انجام نشد</h2><p className="mt-2 text-sm leading-6 text-[#7f332b]">{error}</p><button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-[#d5d0c5] px-5 text-sm font-semibold text-[#252722] transition hover:bg-[#f2f0e9]">تلاش دوباره</button></section>}
        {loading ? <div role="status" aria-label="در حال بارگذاری محصولات" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{[0,1,2,3,4,5,6,7].map((item) => <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-[#e4e0d8] bg-[#fffefa]"><div className="aspect-[4/5] bg-[#e9e5dc]" /><div className="space-y-3 p-3 sm:p-4"><div className="h-4 w-3/4 rounded-full bg-[#e9e5dc]" /><div className="h-4 w-1/2 rounded-full bg-[#e9e5dc]" /><div className="h-10 rounded-full bg-[#e9e5dc]" /></div></div>)}</div>
          : !error && products.length > 0 ? <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div>
          : !error && <section className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d5d0c5] bg-[#fffefa] px-5 py-12 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9ede4] text-[#536049]"><Search size={24} aria-hidden="true" /></div><h2 className="font-serif text-2xl font-medium">هنوز محصولی در این دسته‌بندی نیست</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#55584f]">دسته‌بندی دیگری را ببینید یا همه محصولات را جست‌وجو کنید.</p><Link to="/shop" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#252722] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b]">نمایش همه محصولات</Link></section>}
      </div>
    </main>
  );
};
export default CategoryPage;
