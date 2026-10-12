import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "../lib/axios";
import ProductCard from "../components/ProductCard";

const categories = [
  ["", "همه دسته‌بندی‌ها"], ["jeans", "شلوار جین"], ["t-shirts", "تی‌شرت"],
  ["shoes", "کفش"], ["glasses", "عینک"], ["jackets", "کت و کاپشن"],
  ["suits", "کت‌وشلوار"], ["bags", "کیف"],
];

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    sort: searchParams.get("sort") || "newest",
  });
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setFilters({
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      sort: searchParams.get("sort") || "newest",
    });
    let active = true;
    setLoading(true);
    setError("");
    axios.get(`/products/search?${searchParams.toString()}`)
      .then(({ data }) => {
        if (!active) return;
        setProducts(data.products || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 });
      })
      .catch((requestError) => {
        if (!active) return;
        setProducts([]);
        setError(requestError.response?.data?.message || "دریافت محصولات ناموفق بود.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams]);

  const applyFilters = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    Object.entries({ ...filters, page: "1" }).forEach(([key, value]) => {
      if (String(value).trim() !== "") next.set(key, String(value).trim());
    });
    setSearchParams(next);
  };

  const changePage = (page) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const fieldClass = "min-h-11 w-full rounded-xl border border-[#d5d0c5] bg-[#fffefa] px-3 py-2 text-sm text-[#252722] outline-none transition focus:border-[#68745f] focus:ring-2 focus:ring-[#68745f]/20";

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f5f0] px-4 py-8 text-[#252722] sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#68745f]">مجموعه فروشگاه</p><h1 className="font-serif text-3xl font-medium sm:text-4xl">جست‌وجو و انتخاب محصول</h1></div>
          <Link to="/" className="inline-flex min-h-10 items-center gap-2 self-start rounded-full px-3 text-sm text-[#62645c] transition hover:bg-[#e9e5dc]"><ArrowLeft size={16} aria-hidden="true" />بازگشت به صفحه اصلی</Link>
        </div>

        <form onSubmit={applyFilters} className="mb-8 rounded-2xl border border-[#e4e0d8] bg-[#fffefa] p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={18} className="text-[#68745f]" aria-hidden="true" />جست‌وجو و فیلترها</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium text-[#62645c] lg:col-span-2">نام یا توضیحات محصول
              <div className="relative mt-1"><Search size={17} className="absolute right-3 top-3 text-[#89897f]" aria-hidden="true" /><input type="search" className={`${fieldClass} pr-10`} placeholder="مثلاً کت، کیف، شلوار جین…" value={filters.q} onChange={(event) => setFilters({ ...filters, q: event.target.value })} /></div>
            </label>
            <label className="text-xs font-medium text-[#62645c]">دسته‌بندی
              <select className={`${fieldClass} mt-1`} value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}>{categories.map(([value, label]) => <option key={value || "all"} value={value}>{label}</option>)}</select>
            </label>
            <label className="text-xs font-medium text-[#62645c]">حداقل قیمت<input type="number" min="0" step="any" inputMode="decimal" dir="ltr" className={`${fieldClass} mt-1`} value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} placeholder="0" /></label>
            <label className="text-xs font-medium text-[#62645c]">حداکثر قیمت<input type="number" min="0" step="any" inputMode="decimal" dir="ltr" className={`${fieldClass} mt-1`} value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} placeholder="بدون محدودیت" /></label>
            <label className="text-xs font-medium text-[#62645c]">مرتب‌سازی
              <select className={`${fieldClass} mt-1`} value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}>
                <option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="priceAsc">ارزان‌ترین</option><option value="priceDesc">گران‌ترین</option><option value="nameAsc">نام محصول (الف تا ی)</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#252722] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#41443b]">اعمال فیلترها<Search size={16} aria-hidden="true" /></button>
            <button type="button" onClick={() => { setFilters({ q: "", category: "", minPrice: "", maxPrice: "", sort: "newest" }); setSearchParams({}); }} className="min-h-11 rounded-full border border-[#d5d0c5] px-5 py-2 text-sm font-semibold text-[#252722] transition hover:border-[#252722]">پاک‌کردن فیلترها</button>
          </div>
        </form>

        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-[#62645c]" aria-live="polite">{loading ? "در حال جست‌وجو…" : `${new Intl.NumberFormat("fa-IR").format(pagination.total)} محصول پیدا شد`}</p>
        </div>
        {error && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-[#62645c]" role="status"><LoaderCircle size={20} className="animate-spin" aria-hidden="true" />در حال بارگذاری محصولات…</div> :
          products.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{products.map((product) => <ProductCard key={product._id} product={product} />)}</div> :
          !error && <div className="rounded-2xl border border-[#e4e0d8] bg-[#fffefa] px-6 py-14 text-center"><h2 className="font-serif text-2xl">محصولی پیدا نشد</h2><p className="mt-2 text-sm leading-6 text-[#77786f]">فیلترها را تغییر دهید یا عبارت ساده‌تری جست‌وجو کنید.</p></div>}
        {!loading && pagination.totalPages > 1 && <nav aria-label="صفحه‌بندی محصولات" className="mt-8 flex items-center justify-center gap-3"><button type="button" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)} className="min-h-10 rounded-full border border-[#d5d0c5] px-4 text-sm disabled:opacity-40">قبلی</button><span className="text-sm tabular-nums text-[#62645c]">صفحه {new Intl.NumberFormat("fa-IR").format(pagination.page)} از {new Intl.NumberFormat("fa-IR").format(pagination.totalPages)}</span><button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)} className="min-h-10 rounded-full border border-[#d5d0c5] px-4 text-sm disabled:opacity-40">بعدی</button></nav>}
      </div>
    </main>
  );
};

export default ShopPage;
