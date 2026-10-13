import { useEffect, useState } from "react";
import { Search, LoaderCircle, Sparkles, ShoppingBag, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import axios from "../lib/axios";
import ProductCard from "../components/ProductCard";
import { formatPrice } from "../lib/commerce";

const categoryLabels = { jeans: "شلوار جین", "t-shirts": "تی‌شرت", shoes: "کفش", glasses: "عینک", jackets: "کت و کاپشن", suits: "کت‌وشلوار", bags: "کیف" };
const sortLabels = { oldest: "قدیمی‌ترین", priceAsc: "ارزان‌ترین", priceDesc: "گران‌ترین", nameAsc: "نام محصول (الف تا ی)" };
const sortOptions = [["newest","جدیدترین"],["oldest","قدیمی‌ترین"],["priceAsc","ارزان‌ترین"],["priceDesc","گران‌ترین"],["nameAsc","نام محصول (الف تا ی)"]];
const categoryOptions = [["","همه دسته‌بندی‌ها"], ...Object.entries(categoryLabels)];
const persianNumber = (value) => new Intl.NumberFormat("fa-IR").format(Number(value) || 0);
const defaultFilters = { category: "", minPrice: "", maxPrice: "", sort: "newest" };
const fieldClass = "mt-1 min-h-11 w-full rounded-xl border border-[#d5d0c5] bg-[#fffefa] px-3 py-2 text-sm text-[#252722] outline-none transition focus:border-[#68745f] focus:ring-2 focus:ring-[#68745f]/20";

const ShopPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(defaultFilters);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    axios.get(`/products/search?${searchParams.toString()}`)
      .then(({ data }) => { if (!active) return; setProducts(Array.isArray(data.products) ? data.products : []); setPagination(data.pagination || { page: 1, total: 0, totalPages: 0 }); })
      .catch((requestError) => { if (!active) return; setProducts([]); setPagination({ page: 1, total: 0, totalPages: 0 }); setError(requestError.response?.data?.message || "دریافت محصولات ناموفق بود."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [searchParams]);

  useEffect(() => { setFilterDraft({ category: searchParams.get("category") || "", minPrice: searchParams.get("minPrice") || "", maxPrice: searchParams.get("maxPrice") || "", sort: searchParams.get("sort") || "newest" }); }, [searchParams]);

  useEffect(() => {
    if (!filterPanelOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") setFilterPanelOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", closeOnEscape); };
  }, [filterPanelOpen]);

  const query = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("category") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const sort = searchParams.get("sort") || "newest";
  const activeFilters = [
    category ? { key: "category", label: `دسته‌بندی: ${categoryLabels[category] || category}` } : null,
    minPrice ? { key: "minPrice", label: `از ${formatPrice(minPrice)}` } : null,
    maxPrice ? { key: "maxPrice", label: `تا ${formatPrice(maxPrice)}` } : null,
    sort !== "newest" && sortLabels[sort] ? { key: "sort", label: `مرتب‌سازی: ${sortLabels[sort]}` } : null,
  ].filter(Boolean);

  const changePage = (page) => { const next = new URLSearchParams(searchParams); next.set("page", String(page)); setSearchParams(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const removeFilter = (key) => { const next = new URLSearchParams(searchParams); next.delete(key); next.delete("page"); setSearchParams(next); };
  const clearAllFilters = () => { const next = new URLSearchParams(); if (query) next.set("q", query); setSearchParams(next); setFilterPanelOpen(false); setError(""); };
  const applyFilters = (event) => {
    event.preventDefault();
    if (filterDraft.minPrice && filterDraft.maxPrice && Number(filterDraft.minPrice) > Number(filterDraft.maxPrice)) { setError("حداقل قیمت نمی‌تواند از حداکثر قیمت بیشتر باشد."); return; }
    const next = new URLSearchParams(searchParams);
    Object.entries(filterDraft).forEach(([key,value]) => { const normalized=String(value).trim(); if (normalized && !(key==="sort" && normalized==="newest")) next.set(key,normalized); else next.delete(key); });
    next.set("page","1"); setSearchParams(next); setFilterPanelOpen(false); setError(""); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f5f0] px-3 pb-24 pt-7 text-[#252722] sm:px-6 sm:pb-10 sm:pt-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 border-b border-[#e4e0d8] pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6">
          <div className="min-w-0"><p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-[#68745f]"><Sparkles size={15} aria-hidden="true" />مجموعه فروشگاه</p><h1 className="font-serif text-3xl font-medium tracking-tight sm:text-4xl">{query ? "نتایج جست‌وجو" : "محصولات منتخب"}<span className="text-[#68745f]">.</span></h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#55584f]">{query ? <>نتیجه‌های مرتبط با <span className="font-semibold text-[#252722]">«{query}»</span></> : "محصول موردنظرتان را با فیلترهای دسته‌بندی، قیمت و مرتب‌سازی پیدا کنید."}</p></div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div aria-live="polite" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#e4e0d8] bg-[#fffefa] px-4 py-2 text-sm text-[#55584f]">{loading ? <LoaderCircle size={16} className="animate-spin text-[#68745f]" aria-hidden="true" /> : <ShoppingBag size={16} className="text-[#68745f]" aria-hidden="true" />}{loading ? "در حال جست‌وجو…" : `${persianNumber(pagination.total)} محصول`}</div>
            <button type="button" onClick={() => setFilterPanelOpen(true)} className="hidden min-h-11 items-center gap-2 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-4 text-sm font-semibold text-[#41443b] transition hover:border-[#a8a597] hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f] sm:inline-flex"><SlidersHorizontal size={16} aria-hidden="true" />فیلتر و مرتب‌سازی{activeFilters.length > 0 && <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-[#68745f] px-1.5 py-0.5 text-xs text-white">{persianNumber(activeFilters.length)}</span>}</button>
          </div>
        </header>
        <div className="mb-5 flex items-center justify-between gap-3"><p className="text-xs text-[#55584f] sm:text-sm">{loading ? "در حال آماده‌سازی محصولات…" : `${persianNumber(products.length)} مورد در این صفحه`}</p><button type="button" onClick={() => setFilterPanelOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-3 text-xs font-semibold text-[#41443b] transition hover:bg-[#e9ede4] sm:hidden"><SlidersHorizontal size={15} aria-hidden="true" />فیلترها و مرتب‌سازی{activeFilters.length > 0 && <span className="rounded-full bg-[#68745f] px-1.5 py-0.5 text-white">{persianNumber(activeFilters.length)}</span>}</button></div>
        {activeFilters.length > 0 && <section aria-label="فیلترهای فعال" className="mb-6 flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 pl-1 text-xs font-semibold text-[#55584f]"><SlidersHorizontal size={15} className="text-[#68745f]" aria-hidden="true" />فیلترهای فعال <span className="tabular-nums text-[#707267]">({persianNumber(activeFilters.length)})</span></span>{activeFilters.map((filter) => <button key={filter.key} type="button" onClick={() => removeFilter(filter.key)} aria-label={`حذف فیلتر ${filter.label}`} className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-3 py-1.5 text-xs font-medium text-[#41443b] transition hover:border-[#a8a597] hover:bg-[#e9ede4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><span>{filter.label}</span><X size={13} className="text-[#707267]" aria-hidden="true" /></button>)}<button type="button" onClick={clearAllFilters} className="inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-semibold text-[#536049] transition hover:bg-[#e9ede4]">پاک‌کردن فیلترها</button></section>}
        {error && <div role="alert" className="mb-6 rounded-2xl border border-[#e6c7c2] bg-[#fff7f5] p-4 text-sm leading-6 text-[#8b3d34]">{error}</div>}
        {loading ? <div role="status" aria-label="در حال بارگذاری" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{[0,1,2,3,4,5,6,7].map((item)=><div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-[#e4e0d8] bg-[#fffefa]"><div className="aspect-[4/5] bg-[#e9e5dc]" /><div className="space-y-3 p-3 sm:p-4"><div className="h-4 w-3/4 rounded-full bg-[#e9e5dc]" /><div className="h-4 w-1/2 rounded-full bg-[#e9e5dc]" /><div className="h-10 rounded-full bg-[#e9e5dc]" /></div></div>)}</div>
          : products.length > 0 ? <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{products.map((product)=><ProductCard key={product._id} product={product} />)}</div>
          : !error && <section className="flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-[#d5d0c5] bg-[#fffefa] px-5 py-12 text-center"><div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e9ede4] text-[#536049]"><Search size={24} aria-hidden="true" /></div><h2 className="font-serif text-2xl font-medium">محصولی پیدا نشد</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#55584f]">عبارت جست‌وجو یا فیلترها را تغییر دهید تا نتیجه‌های بیشتری ببینید.</p><button type="button" onClick={clearAllFilters} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#252722] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#41443b]">نمایش همه محصولات</button></section>}
        {!loading && pagination.totalPages > 1 && <nav aria-label="صفحه‌بندی محصولات" className="mt-8 flex items-center justify-center gap-3 border-t border-[#e4e0d8] pt-6"><button type="button" disabled={pagination.page<=1} onClick={()=>changePage(pagination.page-1)} className="min-h-11 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-4 text-sm font-medium transition hover:border-[#a8a597] disabled:cursor-not-allowed disabled:opacity-40">قبلی</button><span className="text-sm tabular-nums text-[#55584f]">صفحه {persianNumber(pagination.page)} از {persianNumber(pagination.totalPages)}</span><button type="button" disabled={pagination.page>=pagination.totalPages} onClick={()=>changePage(pagination.page+1)} className="min-h-11 rounded-full border border-[#d5d0c5] bg-[#fffefa] px-4 text-sm font-medium transition hover:border-[#a8a597] disabled:cursor-not-allowed disabled:opacity-40">بعدی</button></nav>}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d5d0c5] bg-[#fffefa]/95 px-4 py-3 shadow-[0_-12px_32px_-24px_rgba(37,39,34,0.35)] backdrop-blur-xl sm:hidden"><button type="button" onClick={() => setFilterPanelOpen(true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#252722] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#68745f]"><SlidersHorizontal size={17} aria-hidden="true" />فیلتر و مرتب‌سازی{activeFilters.length > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5">{persianNumber(activeFilters.length)}</span>}</button></div>
      {filterPanelOpen && <div className="fixed inset-0 z-[80] flex items-end justify-center md:items-center md:p-4" dir="rtl"><button type="button" aria-label="بستن فیلترها" onClick={() => setFilterPanelOpen(false)} className="absolute inset-0 bg-[#252722]/40 backdrop-blur-sm" /><section role="dialog" aria-modal="true" aria-labelledby="shop-filter-heading" className="relative z-10 max-h-[88dvh] w-full overflow-y-auto rounded-t-3xl border border-[#e4e0d8] bg-[#fffefa] p-5 shadow-[0_32px_100px_-28px_rgba(37,39,34,0.45)] sm:p-6 md:max-w-xl md:rounded-3xl">
        <div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold tracking-wide text-[#68745f]">جست‌وجوی دقیق‌تر</p><h2 id="shop-filter-heading" className="mt-1 font-serif text-2xl font-medium">فیلتر و مرتب‌سازی</h2><p className="mt-1 text-sm text-[#55584f]">نتیجه‌ها با انتخاب‌های تازه به‌روزرسانی می‌شوند.</p></div><button type="button" onClick={() => setFilterPanelOpen(false)} aria-label="بستن پنجره فیلترها" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e4e0d8] text-[#41443b] transition hover:bg-[#f2f0e9]"><X size={18} aria-hidden="true" /></button></div>
        <form onSubmit={applyFilters} className="space-y-4">
          <label className="block text-sm font-medium text-[#41443b]">دسته‌بندی<select className={fieldClass} value={filterDraft.category} onChange={(event)=>setFilterDraft((c)=>({...c,category:event.target.value}))}>{categoryOptions.map(([value,label])=><option key={value||"all"} value={value}>{label}</option>)}</select></label>
          <div><p className="text-sm font-medium text-[#41443b]">محدوده قیمت</p><div className="mt-1 grid grid-cols-2 gap-3"><label className="text-xs text-[#55584f]">از<input type="number" min="0" step="any" inputMode="decimal" dir="ltr" placeholder="بدون محدودیت" className={fieldClass} value={filterDraft.minPrice} onChange={(event)=>setFilterDraft((c)=>({...c,minPrice:event.target.value}))}/></label><label className="text-xs text-[#55584f]">تا<input type="number" min="0" step="any" inputMode="decimal" dir="ltr" placeholder="بدون محدودیت" className={fieldClass} value={filterDraft.maxPrice} onChange={(event)=>setFilterDraft((c)=>({...c,maxPrice:event.target.value}))}/></label></div></div>
          <label className="block text-sm font-medium text-[#41443b]">مرتب‌سازی<select className={fieldClass} value={filterDraft.sort} onChange={(event)=>setFilterDraft((c)=>({...c,sort:event.target.value}))}>{sortOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <div className="flex flex-col gap-2 border-t border-[#eeeae2] pt-4 sm:flex-row"><button type="submit" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#252722] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#41443b]">اعمال فیلترها <Search size={16} aria-hidden="true" /></button><button type="button" onClick={clearAllFilters} className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d5d0c5] px-4 py-3 text-sm font-semibold text-[#41443b] transition hover:bg-[#f2f0e9]">پاک‌کردن فیلترها</button></div>
        </form>
      </section></div>}
    </main>
  );
};
export default ShopPage;
